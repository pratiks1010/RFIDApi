import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import AdminViewUserStock from './AdminViewUserStock';
import { toast } from 'react-toastify';

// Add CSS animation for spinner
const spinnerStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = spinnerStyles;
  document.head.appendChild(styleElement);
}

// Helper for compact pagination
function getPagination(current, total) {
  const pages = [];
  if (total <= 6) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
  }
  return pages;
}

const AdminUsers = ({ 
  userType, // 'rfid' or 'erp'
  users, 
  erpUsers, 
  loading, 
  error,
  onViewDetails 
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsError, setUserDetailsError] = useState('');
  const [showRfidData, setShowRfidData] = useState(false);
  const [rfidData, setRfidData] = useState([]);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidError, setRfidError] = useState('');
  const [currentClientCode, setCurrentClientCode] = useState('');
  const [rfidPage, setRfidPage] = useState(1);
  const [rfidSearch, setRfidSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [showStockView, setShowStockView] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [rfidTypeValue, setRfidTypeValue] = useState('');
  const [updatingRfidType, setUpdatingRfidType] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageSize = 15;
  const isRfid = userType === 'rfid';
  const currentUsers = isRfid ? users : erpUsers;

  // Filter users based on search
  const filteredUsers = currentUsers.filter(u => {
    if (isRfid) {
      return (u.UserName?.toLowerCase().includes(search.toLowerCase()) ||
              u.ClientCode?.toLowerCase().includes(search.toLowerCase()));
    } else {
      return ((u.UserName || u.ClientName || '').toLowerCase().includes(search.toLowerCase()) ||
              (u.ClientCode || '').toLowerCase().includes(search.toLowerCase()));
    }
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const pageData = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // Beautiful solid colors for avatars and buttons
  const colors = [
    '#667eea', // Blue
    '#f5576c', // Pink
    '#4facfe', // Light Blue
    '#43e97b', // Green
    '#fa709a', // Rose Pink
    '#a8edea'  // Teal
  ];

  const handleViewDetails = async (clientCode) => {
    console.log('handleViewDetails called with clientCode:', clientCode);
    console.log('clientCode type:', typeof clientCode);
    
    // Validate clientCode
    if (!clientCode || clientCode === 'null' || clientCode === 'undefined') {
      console.error('Invalid clientCode provided:', clientCode);
      setUserDetailsError('Invalid client code. Cannot fetch user details.');
      return;
    }

    setUserDetailsLoading(true);
    setUserDetailsError('');
    setSelectedUser(clientCode);
    setUserDetails(null);
    
    try {
      const token = localStorage.getItem('adminToken');
      // Use different endpoints based on user type
      const endpoint = isRfid 
        ? `https://rrgold.loyalstring.co.in/api/Admin/GetUserByClientCode/${clientCode}`
        : `https://rrgold.loyalstring.co.in/api/Admin/GetSparkleUserByClientCode/${clientCode}`;
      
      console.log('Making API call to:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch user details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('User details received:', data);
      setUserDetails(data);
    } catch (err) {
      console.error('Error in handleViewDetails:', err);
      setUserDetailsError(err.message || 'Error fetching user details');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleBackToGrid = () => {
    setSelectedUser(null);
    setUserDetails(null);
    setUserDetailsError('');
    setShowRfidData(false);
    setRfidData([]);
    setRfidError('');
    setCurrentClientCode('');
    setShowStockView(false);
    setRfidSearch('');
    setEditingItem(null);
    setEditingValue('');
  };

  const handleViewRfidData = async (clientCode) => {
    console.log('Fetching RFID data for client code:', clientCode);
    
    if (!clientCode) {
      console.error('No client code provided!');
      setRfidError('No client code available');
      return;
    }
    
    setRfidLoading(true);
    setRfidError('');
    setCurrentClientCode(clientCode);
    
    try {
      const token = localStorage.getItem('adminToken');
      const requestBody = { clientCode: clientCode };
      
      const response = await fetch('https://soni.loyalstring.co.in/api/ProductMaster/GetAllRFID', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('RFID API Error:', errorText);
        throw new Error(`Failed to fetch RFID data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('RFID data loaded successfully:', data.length, 'items');
      setRfidData(Array.isArray(data) ? data : []);
      setShowRfidData(true);
    } catch (err) {
      console.error('Error fetching RFID data:', err);
      setRfidError(err.message || 'Error fetching RFID data');
    } finally {
      setRfidLoading(false);
    }
  };

  const handleExportPage = () => {
    if (!pageData.length) return;
    
    const exportData = pageData.map(user => {
      if (isRfid) {
        return {
          'User Name': user.UserName,
          'Client Code': user.ClientCode,
          'User Type': user.UserType,
        };
      } else {
        return {
          'Client Code': user.ClientCode,
          'First Name': user.FirstName,
          'Last Name': user.LastName,
          'Mobile': user.Mobile,
          'Client Email': user.ClientEmail,
          'User Name': user.UserName,
          'City': user.City,
          'State': user.State,
          'Country': user.Country,
          'Organisation Name': user.OrganisationName,
          'Organisation Details': user.OrganisationDetails,
          'RFID Type': user.RfidType,
        };
      }
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isRfid ? 'RFID Users' : 'ERP Users');
    XLSX.writeFile(wb, `${isRfid ? 'RFID_Third_Party' : 'Sparkle_ERP'}_Users_Page${page}.xlsx`);
  };

  const handleViewStock = () => {
    setShowStockView(true);
  };

  const handleBackFromStock = () => {
    setShowStockView(false);
  };

  const handleExportRfidData = () => {
    if (!rfidData.length) return;
    
    const exportData = rfidData.map(item => ({
      'Barcode Number': item.BarcodeNumber || 'N/A',
      'EPC Value': item.TidValue || 'N/A',
      'Client Code': currentClientCode,
      'Created On': item.CreatedOn || 'N/A',
      'Last Updated': item.LastUpdated || 'N/A'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RFID Data');
    XLSX.writeFile(wb, `RFID_Data_${currentClientCode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleEditEpc = (item) => {
    setEditingItem(item);
    setEditingValue(item.TidValue || '');
  };

  const handleSaveEpc = async () => {
    if (!editingItem || !editingValue.trim()) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Admin/UpdateClientTidValue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ClientCode: currentClientCode,
          BarcodeNumber: editingItem.BarcodeNumber,
          NewTidValue: editingValue.trim()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update TID value: ${response.status} ${response.statusText}`);
      }
      
      // Update local data
      setRfidData(prevData => 
        prevData.map(item => 
          item.BarcodeNumber === editingItem.BarcodeNumber 
            ? { ...item, TidValue: editingValue.trim() }
            : item
        )
      );
      
      setEditingItem(null);
      setEditingValue('');
      
      toast.success(`🎉 TID value updated successfully for barcode "${editingItem.BarcodeNumber}"!`, {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: '#10B981',
          color: '#ffffff',
          fontWeight: '500',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }
      });
      
    } catch (err) {
      console.error('Error updating TID value:', err);
      toast.error(`❌ ${err.message || 'Error updating TID value'}`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: '#EF4444',
          color: '#ffffff',
          fontWeight: '500',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
        }
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingValue('');
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.message.trim()) {
      alert('Please enter both subject and message');
      return;
    }

    setSendingEmail(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Admin/SendEmailToClient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ClientCode: userDetails.ClientCode,
          Subject: emailData.subject,
          Message: emailData.message
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
      }
      
      // Handle both JSON and text responses
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }
      
      // Show success popup
      setEmailSuccess(true);
      setShowEmailModal(false);
      setEmailData({ subject: '', message: '' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setEmailSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error sending email:', err);
      alert(err.message || 'Error sending email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Set initial RFID type value when userDetails are loaded
  React.useEffect(() => {
    if (userDetails && userDetails.RfidType) {
      setRfidTypeValue(userDetails.RfidType);
    }
  }, [userDetails]);

  const handleUpdateRfidType = async () => {
    if (!userDetails?.ClientCode || !rfidTypeValue) {
      toast.error('Missing client code or RFID type value', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    setUpdatingRfidType(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Admin/UpdateRfidType', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ClientCode: userDetails.ClientCode,
          RfidType: rfidTypeValue
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update RFID type: ${response.status} ${response.statusText}`);
      }
      
      // Update the userDetails with new RFID type
      setUserDetails(prev => ({
        ...prev,
        RfidType: rfidTypeValue
      }));
      
      toast.success(`🎉 RFID type updated successfully to "${rfidTypeValue}"!`, {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: '#10B981',
          color: '#ffffff',
          fontWeight: '500',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }
      });
      
    } catch (err) {
      console.error('Error updating RFID type:', err);
      toast.error(`❌ ${err.message || 'Error updating RFID type'}`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          background: '#EF4444',
          color: '#ffffff',
          fontWeight: '500',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
        }
      });
    } finally {
      setUpdatingRfidType(false);
    }
  };

  // If viewing stock data
  if (showStockView && userDetails) {
    return (
      <AdminViewUserStock 
        clientCode={userDetails.ClientCode}
        userName={userDetails.UserName}
        onBack={handleBackFromStock}
      />
    );
  }

  // If viewing RFID data
  if (showRfidData) {
    // Filter RFID data based on search
    const filteredRfidData = rfidData.filter(item => {
      const searchTerm = rfidSearch.toLowerCase();
      return (
        (item.BarcodeNumber?.toLowerCase().includes(searchTerm)) ||
        (item.TidValue?.toLowerCase().includes(searchTerm))
      );
    });

    const pageSize = 20;
    const totalItems = filteredRfidData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (rfidPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = filteredRfidData.slice(startIndex, endIndex);
    
    // Split data into two halves for left and right tables
    const midPoint = Math.ceil(currentPageData.length / 2);
    const leftTableData = currentPageData.slice(0, midPoint);
    const rightTableData = currentPageData.slice(midPoint);

    return (
      <div style={{
        maxWidth: 1600,
        margin: '16px auto',
        background: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e4e7ec',
        padding: '24px',
        position: 'relative',
        minHeight: 'auto',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e4e7ec'
        }}>
          <button 
            onClick={handleBackToGrid} 
            style={{ 
              background: '#0077d4', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: 8, 
              padding: '8px 16px', 
              fontWeight: 500, 
              fontSize: 14, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              transition: 'all 0.2s ease',
              outline: 'none',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              height: '40px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#0056b3';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#0077d4';
            }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: 12 }}></i> 
            Back to Users
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 48,
              height: 48,
              background: '#0077d4',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
          }}>
              <i className="fas fa-microchip" style={{ fontSize: '20px', color: '#ffffff' }}></i>
          </div>
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#101828',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                RFID Data
              </div>
              <div style={{
                fontSize: '14px',
                color: '#667085',
                fontWeight: 400,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                Client: {currentClientCode}
              </div>
            </div>
          </div>
        </div>

        {/* Search and Export Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', width: 380, maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search by barcode number or EPC value..."
              value={rfidSearch}
              onChange={e => {
                setRfidSearch(e.target.value);
                setRfidPage(1); // Reset to first page when searching
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 8,
                border: '1px solid #e4e7ec',
                fontSize: 14,
                background: '#ffffff',
                fontWeight: 400,
                color: '#101828',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                height: '40px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0077d4';
                e.target.style.boxShadow = '0 0 0 2px rgba(0, 119, 212, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#e4e7ec';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#667085'
            }}>
              <i className="fas fa-search" style={{ fontSize: 14 }}></i>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportRfidData}
            disabled={!rfidData.length}
            style={{
              background: rfidData.length ? '#10b981' : 'transparent',
              color: rfidData.length ? '#ffffff' : '#9ca3af',
              border: '1px solid #e4e7ec',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: 14,
              cursor: rfidData.length ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              outline: 'none',
              height: '40px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onMouseEnter={e => {
              if (rfidData.length) {
                e.currentTarget.style.background = '#059669';
              }
            }}
            onMouseLeave={e => {
              if (rfidData.length) {
                e.currentTarget.style.background = '#10b981';
              }
            }}
          >
            <i className="fas fa-download" style={{ fontSize: 12 }}></i>
            Export Excel
          </button>
        </div>

        {rfidLoading ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#0077d4', 
            fontSize: '14px', 
            padding: '3rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid #e3f2fd',
              borderTop: '3px solid #0077d4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Loading RFID data...
          </div>
        ) : rfidError ? (
          <div style={{ 
            color: '#dc2626', 
            textAlign: 'center', 
            fontWeight: 500,
            padding: '2rem',
            background: '#fef2f2',
            borderRadius: 8,
            border: '1px solid #fecaca',
            fontSize: '14px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 8, fontSize: '16px' }}></i>
            {rfidError}
          </div>
        ) : totalItems === 0 ? (
          <div style={{ 
            color: '#6b7280', 
            textAlign: 'center', 
            fontWeight: 400, 
            fontSize: '16px', 
            padding: '3rem',
            background: '#ffffff',
            borderRadius: 8,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            <i className="fas fa-microchip" style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem', display: 'block' }}></i>
            No RFID data found for this client.
          </div>
        ) : (
          <>
            {/* Stats Header */}
            <div style={{
              background: '#0077d4',
              color: '#ffffff',
              padding: '20px 24px',
              borderRadius: 8,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #e4e7ec',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-database" style={{ fontSize: '18px', color: '#ffffff' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                    RFID Records
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                    {rfidSearch ? `Found: ${totalItems} of ${rfidData.length} items` : `Total: ${totalItems} items`} • Page {rfidPage} of {totalPages}
                  </div>
                </div>
              </div>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.15)', 
                padding: '8px 16px', 
                borderRadius: 6,
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff'
              }}>
                Showing {startIndex + 1} - {Math.min(endIndex, totalItems)}
              </div>
            </div>

            {/* Two Tables Side by Side */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* Left Table */}
              <div style={{
                background: '#ffffff',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #e4e7ec'
              }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                  fontSize: '14px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                  <thead>
                      <tr style={{ 
                      background: '#f9fafb',
                      borderBottom: '1px solid #e4e7ec'
                      }}>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                        fontWeight: 600, 
                        color: '#101828',
                        fontSize: '14px'
                        }}>
                          Barcode Number
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                        fontWeight: 600, 
                        color: '#101828',
                        fontSize: '14px'
                      }}>
                        EPC Value
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        fontWeight: 600, 
                        color: '#101828',
                        fontSize: '14px',
                        width: '80px'
                        }}>
                        Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                                        {leftTableData.map((item, idx) => (
                      <tr key={`left-${idx}`} style={{ 
                        borderBottom: '1px solid #e4e7ec',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ 
                          padding: '12px 16px', 
                          fontSize: '14px',
                          color: '#475467',
                          fontWeight: 500,
                          fontFamily: 'Inter, monospace'
                        }}>
                          {item.BarcodeNumber || 'N/A'}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          fontSize: '13px',
                          color: '#101828',
                          fontWeight: 400,
                          fontFamily: 'Inter, monospace',
                            wordBreak: 'break-all'
                          }}>
                          {editingItem?.Id === item.Id ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                type="text"
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '2px solid #e4e7ec',
                                  fontSize: '12px',
                                  fontFamily: 'Inter, monospace',
                                  outline: 'none',
                                  width: '300px',
                                  minWidth: '300px',
                                  boxSizing: 'border-box',
                                  background: '#ffffff',
                                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                }}
                                onFocus={e => {
                                  e.target.style.borderColor = '#0077d4';
                                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                                }}
                                onBlur={e => {
                                  e.target.style.borderColor = '#e4e7ec';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <button
                                onClick={handleSaveEpc}
                                style={{
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={{
                                  background: '#6b7280',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            item.TidValue || 'N/A'
                          )}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center'
                        }}>
                          {editingItem?.Id !== item.Id && (
                            <button
                              onClick={() => handleEditEpc(item)}
                              style={{
                                background: 'transparent',
                                color: '#0077d4',
                                border: '1px solid #0077d4',
                                borderRadius: 4,
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#0077d4';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#0077d4';
                              }}
                            >
                              Edit
                            </button>
                          )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>

              {/* Right Table */}
              <div style={{
                background: '#ffffff',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #e4e7ec'
              }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                  fontSize: '14px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}>
                  <thead>
                      <tr style={{ 
                      background: '#f9fafb',
                      borderBottom: '1px solid #e4e7ec'
                      }}>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                        fontWeight: 600, 
                        color: '#101828',
                        fontSize: '14px'
                        }}>
                          Barcode Number
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                        fontWeight: 600, 
                        color: '#101828',
                        fontSize: '14px'
                      }}>
                        EPC Value
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        fontWeight: 600, 
                        color: '#101828',
                        fontSize: '14px',
                        width: '80px'
                        }}>
                        Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                    {rightTableData.map((item, idx) => (
                      <tr key={`right-${idx}`} style={{ 
                        borderBottom: '1px solid #e4e7ec',
                          transition: 'background-color 0.2s ease'
                        }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ 
                          padding: '12px 16px', 
                          fontSize: '14px',
                          color: '#475467',
                          fontWeight: 500,
                          fontFamily: 'Inter, monospace'
                          }}>
                            {item.BarcodeNumber || 'N/A'}
                          </td>
                          <td style={{ 
                          padding: '12px 16px', 
                          fontSize: '13px',
                          color: '#101828',
                          fontWeight: 400,
                          fontFamily: 'Inter, monospace',
                            wordBreak: 'break-all'
                          }}>
                          {editingItem?.Id === item.Id ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <input
                                type="text"
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  border: '2px solid #e4e7ec',
                                  fontSize: '12px',
                                  fontFamily: 'Inter, monospace',
                                  outline: 'none',
                                  width: '300px',
                                  minWidth: '300px',
                                  boxSizing: 'border-box',
                                  background: '#ffffff',
                                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                }}
                                onFocus={e => {
                                  e.target.style.borderColor = '#0077d4';
                                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                                }}
                                onBlur={e => {
                                  e.target.style.borderColor = '#e4e7ec';
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <button
                                onClick={handleSaveEpc}
                                style={{
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={{
                                  background: '#6b7280',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  fontWeight: 500
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            item.TidValue || 'N/A'
                          )}
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          textAlign: 'center'
                        }}>
                          {editingItem?.Id !== item.Id && (
                            <button
                              onClick={() => handleEditEpc(item)}
                              style={{
                                background: 'transparent',
                                color: '#0077d4',
                                border: '1px solid #0077d4',
                                borderRadius: 4,
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = '#0077d4';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#0077d4';
                              }}
                            >
                              Edit
                            </button>
                          )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 0',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                <button
                  onClick={() => setRfidPage(Math.max(1, rfidPage - 1))}
                  disabled={rfidPage === 1}
                  style={{
                    background: rfidPage === 1 ? 'transparent' : '#ffffff',
                    color: rfidPage === 1 ? '#9ca3af' : '#374151',
                    border: '1px solid #e4e7ec',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: rfidPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    outline: 'none'
                  }}
                >
                  <i className="fas fa-chevron-left" style={{ fontSize: 12 }}></i>
                  Previous
                </button>
                
                <div style={{
                  display: 'flex',
                  gap: '4px'
                }}>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (rfidPage <= 4) {
                      pageNum = i + 1;
                    } else if (rfidPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = rfidPage - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setRfidPage(pageNum)}
                      style={{
                          background: pageNum === rfidPage ? '#0077d4' : 'transparent',
                          color: pageNum === rfidPage ? '#ffffff' : '#374151',
                          border: '1px solid #e4e7ec',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                          minWidth: '40px',
                          outline: 'none'
                      }}
                      onMouseEnter={e => {
                          if (pageNum !== rfidPage) {
                            e.currentTarget.style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={e => {
                          if (pageNum !== rfidPage) {
                            e.currentTarget.style.background = 'transparent';
                        }
                      }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setRfidPage(Math.min(totalPages, rfidPage + 1))}
                  disabled={rfidPage === totalPages}
                  style={{
                    background: rfidPage === totalPages ? 'transparent' : '#ffffff',
                    color: rfidPage === totalPages ? '#9ca3af' : '#374151',
                    border: '1px solid #e4e7ec',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: rfidPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4,
                    outline: 'none'
                  }}
                >
                  Next
                  <i className="fas fa-chevron-right" style={{ fontSize: 12 }}></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // If showing user details loading
  if (selectedUser && userDetailsLoading) {
    return (
      <div style={{
        maxWidth: 1600,
        margin: '16px auto',
                background: '#ffffff',
        borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f1f1',
        padding: '1.5rem',
        position: 'relative',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                <div style={{
                  display: 'flex',
          flexDirection: 'column',
                  alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid #f1f5f9',
            borderTop: '3px solid #1e5eff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          <div style={{
            fontSize: '16px',
            fontWeight: 500,
            color: '#1e5eff',
            marginBottom: '8px'
          }}>
            Loading User Details
                </div>
          <div style={{
            fontSize: '14px',
            color: '#667085'
      }}>
            Please wait while we fetch the user information...
                </div>
              </div>
            </div>
    );
  }

  // If showing user details error
  if (selectedUser && userDetailsError) {
    return (
              <div style={{
        maxWidth: 1600,
        margin: '16px auto',
                background: '#ffffff',
        borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f1f1',
        padding: '1.5rem',
        position: 'relative',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e4e7ec'
        }}>
          <button 
            onClick={handleBackToGrid} 
            style={{ 
              background: '#1e5eff', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: 8, 
              padding: '8px 16px', 
              fontWeight: 500, 
              fontSize: '14px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
                    transition: 'all 0.2s ease',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              outline: 'none'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#1e40af';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#1e5eff';
            }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: '12px' }}></i> 
            Back to Users
          </button>
        </div>

          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem',
          textAlign: 'center'
          }}>
            <div style={{
            width: 48,
            height: 48,
            background: '#fef2f2',
              borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ 
              fontSize: '20px', 
              color: '#dc2626' 
            }}></i>
          </div>
          <div style={{ 
            fontSize: '16px',
            fontWeight: 500,
            color: '#dc2626', 
            marginBottom: '8px'
          }}>
            Failed to Load User Details
          </div>
            <div style={{
            fontSize: '14px',
            color: '#667085',
            marginBottom: '16px'
          }}>
            {userDetailsError}
          </div>
          <button
            onClick={() => handleViewDetails(selectedUser)}
                      style={{
              background: '#1e5eff',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              outline: 'none'
                      }}
                      onMouseEnter={e => {
              e.currentTarget.style.background = '#1e40af';
                      }}
                      onMouseLeave={e => {
              e.currentTarget.style.background = '#1e5eff';
            }}
          >
            <i className="fas fa-redo" style={{ fontSize: '12px' }}></i>
            Try Again
                </button>
              </div>
      </div>
    );
  }

  // If showing user details
  if (selectedUser && userDetails) {
    return (
      <div style={{
        maxWidth: 1600,
        margin: '16px auto',
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f1f1',
              padding: '1.5rem',
        position: 'relative',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                {/* Header with Back Button and Action Buttons */}
              <div style={{
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e4e7ec'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <button 
              onClick={handleBackToGrid} 
              style={{ 
                background: '#1e5eff', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: 8, 
                padding: '8px 16px', 
                fontWeight: 500, 
                fontSize: '14px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                outline: 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#1e40af';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#1e5eff';
              }}
            >
              <i className="fas fa-arrow-left" style={{ fontSize: '12px' }}></i> 
              Back to Users
            </button>
            
            <div style={{
              width: 40,
              height: 40,
              background: '#1e5eff',
              borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className="fas fa-user" style={{ 
                fontSize: '16px', 
                color: '#ffffff'
              }}></i>
              </div>
            <div>
                <div style={{ 
                fontSize: '18px',
                fontWeight: 600,
                color: '#101828',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                User Details
                </div>
                <div style={{ 
                fontSize: '14px',
                color: '#667085',
                fontWeight: 400,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                {userDetails.UserName || userDetails.ClientName || 'User Information'}
              </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
            gap: '12px',
            alignItems: 'center'
              }}>
                <button
              onClick={() => handleViewRfidData(userDetails.ClientCode)}
                  style={{
                background: '#10b981',
                color: '#ffffff',
                    border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 500,
                fontSize: '14px',
                    cursor: 'pointer',
                transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                gap: 6,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                outline: 'none'
                  }}
                  onMouseEnter={e => {
                e.currentTarget.style.background = '#059669';
                  }}
                  onMouseLeave={e => {
                e.currentTarget.style.background = '#10b981';
                  }}
                >
              <i className="fas fa-microchip" style={{ fontSize: '12px' }}></i>
              View RFID Data
                </button>

                <button
              onClick={handleViewStock}
                  style={{
                background: '#f59e0b',
                color: '#ffffff',
                    border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 500,
                fontSize: '14px',
                    cursor: 'pointer',
                transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                gap: 6,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                outline: 'none'
                  }}
                  onMouseEnter={e => {
                e.currentTarget.style.background = '#d97706';
                  }}
                  onMouseLeave={e => {
                e.currentTarget.style.background = '#f59e0b';
                  }}
                >
              <i className="fas fa-boxes" style={{ fontSize: '12px' }}></i>
                  View Stock
                </button>
              </div>
            </div>

        {/* User Details Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* First Row - Basic Information & Contact Information */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            {/* Basic Information Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e1e5e9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#2c3e50',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                borderBottom: '2px solid #3498db',
                paddingBottom: '8px'
              }}>
                <i className="fas fa-id-card" style={{ color: '#3498db', fontSize: '16px' }}></i>
                Basic Information
              </div>
                
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                  <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>User Name:</span>
                  <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                    {userDetails.UserName || userDetails.ClientName || 'N/A'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                  <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>Client Code:</span>
                  <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                    {userDetails.ClientCode || 'N/A'}
                  </span>
                </div>
                
                {userDetails.UserType && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                    <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>User Type:</span>
                    <span style={{ 
                      color: '#ffffff', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      background: '#3498db',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      textTransform: 'uppercase'
                    }}>
                      {userDetails.UserType}
                    </span>
                  </div>
                )}
                
                {userDetails.FirstName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                    <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>First Name:</span>
                    <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                      {userDetails.FirstName}
                    </span>
                  </div>
                )}
                
                {userDetails.LastName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>Last Name:</span>
                    <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                      {userDetails.LastName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information Card */}
            {(userDetails.Mobile || userDetails.ClientEmail || userDetails.Email) && (
              <div style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #e1e5e9',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#2c3e50',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  borderBottom: '2px solid #27ae60',
                  paddingBottom: '8px'
                }}>
                  <i className="fas fa-address-book" style={{ color: '#27ae60', fontSize: '16px' }}></i>
                  Contact Information
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {userDetails.Mobile && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                      <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>Mobile:</span>
                      <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                        {userDetails.Mobile}
                      </span>
                    </div>
                  )}
                  
                  {(userDetails.ClientEmail || userDetails.Email) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>Email:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                          {userDetails.ClientEmail || userDetails.Email}
                        </span>
                        <button
                          onClick={() => setShowEmailModal(true)}
                          style={{
                            background: '#3498db',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontWeight: 500,
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                            outline: 'none'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#2980b9';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.4)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = '#3498db';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <i className="fas fa-envelope" style={{ fontSize: '10px' }}></i>
                          Send Email
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Second Row - Location Information & Organization Information */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            {/* Location Information Card */}
            {(userDetails.City || userDetails.State || userDetails.Country) && (
              <div style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #e1e5e9',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#2c3e50',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  borderBottom: '2px solid #f39c12',
                  paddingBottom: '8px'
                }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#f39c12', fontSize: '16px' }}></i>
                  Location Information
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {userDetails.City && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                      <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>City:</span>
                      <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                        {userDetails.City}
                      </span>
                    </div>
                  )}
                  
                  {userDetails.State && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                      <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>State:</span>
                      <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                        {userDetails.State}
                      </span>
                    </div>
                  )}
                  
                  {userDetails.Country && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>Country:</span>
                      <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                        {userDetails.Country}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organization Information Card */}
            {(userDetails.OrganisationName || userDetails.OrganisationDetails || userDetails.RfidType) && (
              <div style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #e1e5e9',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#2c3e50',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  borderBottom: '2px solid #9b59b6',
                  paddingBottom: '8px'
                }}>
                  <i className="fas fa-building" style={{ color: '#9b59b6', fontSize: '16px' }}></i>
                  Organization Information
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {userDetails.OrganisationName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                      <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>Organization:</span>
                      <span style={{ color: '#2c3e50', fontSize: '14px', fontWeight: 600 }}>
                        {userDetails.OrganisationName}
                      </span>
                    </div>
                  )}
                  
                  {userDetails.RfidType && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #f8f9fa' }}>
                      <span style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500 }}>RFID Type:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <select
                          value={rfidTypeValue}
                          onChange={(e) => setRfidTypeValue(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#2c3e50',
                            background: '#ffffff',
                            cursor: 'pointer',
                            minWidth: '120px'
                          }}
                        >
                          <option value="ReUsable">ReUsable</option>
                          <option value="WebReUsable">WebReUsable</option>
                        </select>
                        <button
                          onClick={handleUpdateRfidType}
                          disabled={updatingRfidType}
                          style={{
                            padding: '8px 16px',
                            background: updatingRfidType ? '#9ca3af' : '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: updatingRfidType ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {updatingRfidType ? (
                            <>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                border: '2px solid #ffffff',
                                borderTop: '2px solid transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                              Updating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save" style={{ fontSize: '10px' }}></i>
                              Update
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {userDetails.OrganisationDetails && (
                    <div style={{ 
                      marginTop: '8px',
                      padding: '16px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ color: '#7f8c8d', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
                        Organization Details:
                      </div>
                      <div style={{ color: '#2c3e50', fontSize: '14px', lineHeight: 1.6 }}>
                        {userDetails.OrganisationDetails}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
              animation: 'modalSlideIn 0.3s ease-out',
              border: '1px solid #e5e7eb'
            }}>
              {/* Modal Header */}
              <div style={{
                background: '#1e40af',
                color: '#ffffff',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-envelope" style={{ fontSize: '18px' }}></i>
                  </div>
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 600
                    }}>
                      Send Email
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      opacity: 0.9
                    }}>
                      Send email to {userDetails?.UserName || userDetails?.ClientName || 'User'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailData({ subject: '', message: '' });
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <i className="fas fa-times" style={{ fontSize: '14px' }}></i>
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ 
                padding: '24px',
                background: '#ffffff'
              }}>
                {/* Subject Field */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1f2937',
                    marginBottom: '10px'
                  }}>
                    <i className="fas fa-tag" style={{ 
                      fontSize: '12px', 
                      color: '#0077d4',
                      opacity: 0.8 
                    }}></i>
                    Subject *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={e => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter email subject"
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        border: '2px solid #e5e7eb',
                        borderRadius: 12,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        '::placeholder': {
                          color: '#9ca3af'
                        }
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#0077d4';
                        e.target.style.boxShadow = '0 0 0 4px rgba(0, 119, 212, 0.1), 0 4px 8px rgba(0, 0, 0, 0.1)';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    />
                  </div>
                </div>

                {/* Message Field */}
                <div style={{ marginBottom: '28px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1f2937',
                    marginBottom: '10px'
                  }}>
                    <i className="fas fa-comment-alt" style={{ 
                      fontSize: '12px', 
                      color: '#0077d4',
                      opacity: 0.8 
                    }}></i>
                    Message *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={emailData.message}
                      onChange={e => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter your message here..."
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        border: '2px solid #e5e7eb',
                        borderRadius: 12,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        resize: 'vertical',
                        minHeight: '130px',
                        lineHeight: '1.5',
                        '::placeholder': {
                          color: '#9ca3af'
                        }
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#0077d4';
                        e.target.style.boxShadow = '0 0 0 4px rgba(0, 119, 212, 0.1), 0 4px 8px rgba(0, 0, 0, 0.1)';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'flex-end',
                  paddingTop: '8px'
                }}>
                  <button
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailData({ subject: '', message: '' });
                    }}
                    style={{
                      padding: '14px 28px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 12,
                      background: '#ffffff',
                      color: '#6b7280',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <i className="fas fa-times" style={{ fontSize: '12px' }}></i>
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !emailData.subject.trim() || !emailData.message.trim()}
                    style={{
                      padding: '14px 32px',
                      border: 'none',
                      borderRadius: 12,
                      background: (sendingEmail || !emailData.subject.trim() || !emailData.message.trim()) 
                        ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)' 
                        : 'linear-gradient(135deg, #0077d4 0%, #0056b3 50%, #004494 100%)',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: (sendingEmail || !emailData.subject.trim() || !emailData.message.trim()) 
                        ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      boxShadow: (sendingEmail || !emailData.subject.trim() || !emailData.message.trim()) 
                        ? '0 1px 3px rgba(0, 0, 0, 0.1)' 
                        : '0 4px 12px rgba(0, 119, 212, 0.4)',
                      letterSpacing: '-0.01em'
                    }}
                    onMouseEnter={e => {
                      if (!sendingEmail && emailData.subject.trim() && emailData.message.trim()) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #0056b3 0%, #004494 50%, #003875 100%)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 119, 212, 0.5)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!sendingEmail && emailData.subject.trim() && emailData.message.trim()) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #0077d4 0%, #0056b3 50%, #004494 100%)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 119, 212, 0.4)';
                      }
                    }}
                  >
                    {sendingEmail ? (
                      <>
                        <div style={{
                          width: 18,
                          height: 18,
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '2px solid #ffffff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane" style={{ fontSize: '14px' }}></i>
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Success Popup */}
        {emailSuccess && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#10b981',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 1100,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'slideInFromRight 0.4s ease-out',
            minWidth: '300px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                Email Sent Successfully!
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                The email has been delivered to {currentClientCode || 'the client'}
              </div>
            </div>
            <button
              onClick={() => setEmailSuccess(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                marginLeft: 'auto',
                opacity: 0.8,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
            >
              <i className="fas fa-times" style={{ fontSize: '12px' }}></i>
            </button>
          </div>
        )}

        {/* CSS for modal animation */}
        <style jsx>{`
          @keyframes modalSlideIn {
            0% {
              opacity: 0;
              transform: scale(0.9) translateY(-10px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes slideInFromRight {
            0% {
              opacity: 0;
              transform: translateX(100%);
            }
            100% {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>

      </div>
    );
  }

  // Main users view
  return (
    <div style={{ 
      maxWidth: 1600, 
      margin: isMobile ? '0' : '16px auto',
      background: '#ffffff',
      borderRadius: isMobile ? 0 : 12,
      boxShadow: isMobile ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.08)',
      border: isMobile ? 'none' : '1px solid #f1f1f1',
      padding: isMobile ? '16px' : '1.5rem',
      position: 'relative',
      fontFamily: 'Poppins, sans-serif',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        marginBottom: isMobile ? '16px' : '24px',
        padding: '0',
        background: 'transparent',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
        <div style={{
            width: isMobile ? 40 : 48,
            height: isMobile ? 40 : 48,
            background: '#1e5eff',
            borderRadius: 12,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fas fa-users" style={{ 
              fontSize: isMobile ? '16px' : '18px', 
              color: '#ffffff'
            }}></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: isMobile ? '16px' : '18px',
              color: '#101828',
              marginBottom: 2,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              {isRfid ? 'RFID Third Party Users' : 'Sparkle ERP Users'}
            </div>
            <div style={{
              fontSize: isMobile ? '12px' : '14px',
              color: '#667085',
              fontWeight: 400,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              {filteredUsers.length} users • Page {page} of {totalPages}
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '8px' : '12px',
          width: isMobile ? '100%' : 'auto',
          flexWrap: 'wrap'
        }}>
          {/* View Toggle */}
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#f87171' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : '#667085',
                border: '1px solid #e4e7ec',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                outline: 'none'
              }}
              onMouseEnter={e => {
                if (viewMode !== 'grid') {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={e => {
                if (viewMode !== 'grid') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#e4e7ec';
                }
              }}
            >
              <i className="fas fa-th" style={{ fontSize: '12px' }}></i>
              Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#6b7280' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : '#667085',
                border: '1px solid #e4e7ec',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                outline: 'none'
              }}
              onMouseEnter={e => {
                if (viewMode !== 'table') {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={e => {
                if (viewMode !== 'table') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#e4e7ec';
                }
              }}
            >
              <i className="fas fa-list" style={{ fontSize: '12px' }}></i>
              Table
            </button>
          </div>

          {/* Search */}
          <div style={{ 
            position: 'relative', 
            width: isMobile ? '100%' : 280,
            flex: isMobile ? '1' : 'none'
          }}>
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 8,
                border: '1px solid #e4e7ec',
                fontSize: '14px',
                background: '#ffffff',
                fontWeight: 400,
                color: '#101828',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                height: '40px'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0077d4';
                e.target.style.boxShadow = '0 0 0 2px rgba(0, 119, 212, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#e4e7ec';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#667085'
            }}>
              <i className="fas fa-search" style={{ fontSize: '14px' }}></i>
            </div>
          </div>

          {/* Export Button */}
          <button 
            onClick={handleExportPage} 
            style={{
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: '14px',
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              outline: 'none',
              height: '40px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#059669';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#10b981';
            }}
          >
            <i className="fas fa-download" style={{ fontSize: '12px' }}></i>
            Export
          </button>
        </div>
      </div>

      {/* Loading, Error, or User Content */}
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          color: '#0077d4', 
          fontSize: '14px', 
          marginTop: '1rem',
          padding: '2rem',
          background: '#ffffff',
          borderRadius: 8,
          fontFamily: 'Poppins, sans-serif'
        }}>
          <div style={{
            width: 32,
            height: 32,
            border: '2px solid #f1f1f1',
            borderTop: '2px solid #0077d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          Loading users...
        </div>
      ) : error ? (
        <div style={{ 
          color: '#dc2626', 
          textAlign: 'center', 
          fontWeight: 500,
          padding: '2rem',
          background: '#fef2f2',
          borderRadius: 8,
          border: '1px solid #fecaca',
          marginTop: '1rem',
          fontSize: '14px',
          fontFamily: 'Poppins, sans-serif'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 6, fontSize: '14px' }}></i>
          {error}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ 
          color: '#6b7280', 
          textAlign: 'center', 
          fontWeight: 400, 
          fontSize: '14px', 
          marginTop: '1rem',
          padding: '2rem',
          background: '#ffffff',
          borderRadius: 8,
          fontFamily: 'Poppins, sans-serif'
        }}>
          <i className="fas fa-search" style={{ fontSize: '2rem', color: '#d1d5db', marginBottom: '1rem', display: 'block' }}></i>
          No users found matching your search.
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: isMobile ? '12px' : '1.5rem',
          marginBottom: isMobile ? '12px' : '1.5rem'
        }}>
          {pageData.map((user, idx) => {
            const userName = isRfid ? user.UserName : (user.UserName || user.ClientName || 'User');
            let initials = '';
            if (userName) {
              const words = userName.trim().split(' ');
              if (words.length === 1) {
                initials = words[0].slice(0, 2).toUpperCase();
              } else {
                initials = (words[0][0] + (words[1] ? words[1][0] : words[0][1] || '')).toUpperCase();
              }
            } else {
              initials = 'U';
            }



            return (
              <div key={idx} style={{
                background: '#ffffff',
                borderRadius: 8,
                border: '1px solid #e4e7ec',
                padding: 0,
                minHeight: 160,
                display: 'flex', 
                flexDirection: 'column', 
                position: 'relative',
                transition: 'all 0.2s ease',
                cursor: 'default',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
                overflow: 'hidden'
              }}
              onMouseEnter={e => { 
                e.currentTarget.style.transform = 'translateY(-2px)'; 
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 24, 40, 0.15)'; 
                e.currentTarget.style.borderColor = '#d0d5dd';
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(16, 24, 40, 0.1)'; 
                e.currentTarget.style.borderColor = '#e4e7ec';
              }}
              >
                {/* Header Section */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f2f4f7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  {/* Avatar */}
                <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: colors[idx % colors.length],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '16px',
                    color: '#ffffff',
                  textTransform: 'uppercase',
                    flexShrink: 0
                }}>
                  {initials}
                </div>

                  {/* User Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#101828',
                      marginBottom: 2,
                      lineHeight: 1.4,
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                }}>
                  {userName}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#667085',
                      fontWeight: 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user.ClientCode}
                    </div>
                </div>

                  {/* Status Badge */}
                <div style={{ 
                    padding: '2px 8px',
                    borderRadius: 16,
                    background: isRfid ? '#e0f2fe' : '#ecfdf3',
                    border: isRfid ? '1px solid #81d4fa' : '1px solid #d1fadf',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: isRfid ? '#0277bd' : '#039855',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {isRfid ? 'RFID' : 'ERP'}
                  </div>
                </div>

                {/* Content Section */}
                <div style={{
                  padding: '16px 20px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {/* Additional Info */}
                  <div style={{
                    marginBottom: 16
                  }}>
                    {isRfid ? (
                      // RFID User Info
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8
                        }}>
                          <i className="fas fa-microchip" style={{ 
                            fontSize: '12px', 
                            color: '#667085',
                            width: 12 
                          }}></i>
                          <span style={{
                            fontSize: '13px',
                            color: '#667085',
                            fontWeight: 400
                          }}>
                            Type: {user.UserType || 'RFID User'}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <i className="fas fa-id-card" style={{ 
                            fontSize: '12px', 
                            color: '#667085',
                            width: 12 
                          }}></i>
                          <span style={{
                            fontSize: '13px',
                            color: '#667085',
                            fontWeight: 400
                          }}>
                            Client: {user.ClientCode}
                          </span>
                        </div>
                      </>
                    ) : (
                      // ERP User Info
                      <>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8
                        }}>
                          <i className="fas fa-building" style={{ 
                            fontSize: '12px', 
                            color: '#667085',
                            width: 12 
                          }}></i>
                          <span style={{
                            fontSize: '13px',
                            color: '#667085',
                            fontWeight: 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            Org: {user.OrganisationName || 'Not specified'}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8
                        }}>
                          <i className="fas fa-phone" style={{ 
                            fontSize: '12px', 
                            color: '#667085',
                            width: 12 
                          }}></i>
                          <span style={{
                            fontSize: '13px',
                            color: '#667085',
                            fontWeight: 400
                          }}>
                            {user.Mobile || 'No phone'}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <i className="fas fa-map-marker-alt" style={{ 
                            fontSize: '12px', 
                            color: '#667085',
                            width: 12 
                          }}></i>
                          <span style={{
                            fontSize: '13px',
                            color: '#667085',
                            fontWeight: 400
                          }}>
                            {user.City ? `${user.City}, ${user.State || user.Country || ''}`.trim().replace(/,$/, '') : 'Location not specified'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleViewDetails(user.ClientCode)}
                    style={{
                      background: '#ffffff',
                      color: colors[idx % colors.length],
                      border: `1px solid ${colors[idx % colors.length]}`,
                      borderRadius: 6,
                      padding: '8px 14px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = colors[idx % colors.length];
                      e.target.style.color = '#ffffff';
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = '#ffffff';
                      e.target.style.color = colors[idx % colors.length];
                    }}
                  >
                    <i className="fas fa-external-link-alt" style={{ fontSize: '12px' }}></i>
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
            ) : (
        // Table View - Two Tables Side by Side
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? '12px' : '1.5rem',
          marginBottom: isMobile ? '12px' : '1.5rem'
        }}>
          {/* Left Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #e4e7ec',
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
            width: '100%',
            overflowX: 'auto'
          }}>
            <div style={{
              background: '#f9fafb',
              color: '#344054',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'left',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              borderBottom: '1px solid #e4e7ec'
            }}>
              Users (1 - {Math.ceil(pageData.length / 2)})
            </div>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              <thead>
                <tr style={{ 
                  background: '#f9fafb'
                }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: 500,
                    color: '#667085',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e4e7ec'
                  }}>
                    User
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: 500,
                    color: '#667085',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e4e7ec'
                  }}>
                    Details
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontWeight: 500,
                    color: '#667085',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e4e7ec'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.slice(0, Math.ceil(pageData.length / 2)).map((user, idx) => {
                  const userName = isRfid ? user.UserName : (user.UserName || user.ClientName || 'User');
                  const userColor = colors[idx % colors.length];
                  return (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid #f2f4f7',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ 
                        padding: '16px', 
                        fontSize: '14px',
                        color: '#101828',
                        fontWeight: 400,
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: userColor,
                    display: 'flex',
                    alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '14px',
                            color: '#ffffff',
                            textTransform: 'uppercase',
                            flexShrink: 0
                          }}>
                            {userName.slice(0, 2)}
                  </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ 
                              fontWeight: 500,
                              fontSize: '14px',
                              color: '#101828',
                              marginBottom: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {userName}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#667085',
                              fontWeight: 400
                            }}>
                              {isRfid ? (user.UserType || 'RFID User') : (user.OrganisationName || 'ERP User')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px', 
                        fontSize: '13px',
                        color: '#667085',
                        fontWeight: 400,
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ fontWeight: 500, color: '#344054' }}>
                  {user.ClientCode}
                          </span>
                </div>
                        {isRfid ? (
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            RFID Third Party
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            {user.Mobile || 'No phone'}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: '16px', 
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                <button
                          onClick={() => handleViewDetails(user.ClientCode)}
                  style={{
                            background: 'transparent',
                            color: userColor,
                            border: `1px solid ${userColor}`,
                            borderRadius: 6,
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }}
                          onMouseEnter={e => {
                            e.target.style.background = userColor;
                            e.target.style.color = '#ffffff';
                          }}
                          onMouseLeave={e => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = userColor;
                          }}
                        >
                          <i className="fas fa-eye" style={{ fontSize: '11px' }}></i>
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right Table */}
          <div style={{
            background: '#ffffff',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #e4e7ec',
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
            flex: 1,
            width: '100%',
            display: isMobile ? 'none' : 'block'
          }}>
            <div style={{
              background: '#f9fafb',
              color: '#344054',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'left',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              borderBottom: '1px solid #e4e7ec'
            }}>
              Users ({Math.ceil(pageData.length / 2) + 1} - {pageData.length})
            </div>
            <table style={{ 
                    width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              <thead>
                <tr style={{ 
                  background: '#f9fafb'
                }}>
                  <th style={{ 
                    padding: '12px 16px',
                    textAlign: 'left', 
                    fontWeight: 500,
                    color: '#667085',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e4e7ec'
                  }}>
                    User
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontWeight: 500,
                    color: '#667085',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e4e7ec'
                  }}>
                    Details
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontWeight: 500,
                    color: '#667085',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e4e7ec'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.slice(Math.ceil(pageData.length / 2)).map((user, idx) => {
                  const userName = isRfid ? user.UserName : (user.UserName || user.ClientName || 'User');
                  const actualIndex = Math.ceil(pageData.length / 2) + idx;
                  const userColor = colors[actualIndex % colors.length];
                  return (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid #f2f4f7',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ 
                        padding: '16px', 
                        fontSize: '14px',
                        color: '#101828',
                        fontWeight: 400,
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: userColor,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                            fontWeight: 600,
                            fontSize: '14px',
                            color: '#ffffff',
                            textTransform: 'uppercase',
                            flexShrink: 0
                          }}>
                            {userName.slice(0, 2)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ 
                              fontWeight: 500,
                              fontSize: '14px',
                              color: '#101828',
                              marginBottom: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {userName}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#667085',
                              fontWeight: 400
                            }}>
                              {isRfid ? (user.UserType || 'RFID User') : (user.OrganisationName || 'ERP User')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px', 
                        fontSize: '13px',
                        color: '#667085',
                        fontWeight: 400,
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ fontWeight: 500, color: '#344054' }}>
                            {user.ClientCode}
                          </span>
                        </div>
                        {isRfid ? (
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            RFID Third Party
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#667085' }}>
                            {user.Mobile || 'No phone'}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: '16px', 
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        <button
                          onClick={() => handleViewDetails(user.ClientCode)}
                          style={{
                            background: 'transparent',
                            color: userColor,
                            border: `1px solid ${userColor}`,
                            borderRadius: 6,
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                  onMouseEnter={e => { 
                            e.target.style.background = userColor;
                            e.target.style.color = '#ffffff';
                  }}
                  onMouseLeave={e => { 
                            e.target.style.background = 'transparent';
                            e.target.style.color = userColor;
                  }}
                >
                          <i className="fas fa-eye" style={{ fontSize: '11px' }}></i>
                  View Details
                </button>
                      </td>
                    </tr>
            );
          })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #f1f1f1'
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              background: page === 1 ? '#f1f1f1' : '#0077d4',
              color: page === 1 ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: 6,
              width: 32,
              height: 32,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          
          {getPagination(page, totalPages).map((p, i) =>
            p === '...'
              ? <span key={i} style={{ 
                  padding: '0 8px', 
                  color: '#6b7280', 
                  fontWeight: 400, 
                  fontSize: '14px',
                  fontFamily: 'Poppins, sans-serif'
                }}>...</span>
              : <button
                key={i}
                onClick={() => setPage(p)}
                style={{
                  background: page === p ? '#0077d4' : '#ffffff',
                  color: page === p ? '#ffffff' : '#38414a',
                  border: page === p ? 'none' : '1px solid #f1f1f1',
                  borderRadius: 6,
                  width: 32,
                  height: 32,
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontFamily: 'Poppins, sans-serif'
                }}
                onMouseEnter={e => {
                  if (page !== p) {
                    e.target.style.background = '#f1f1f1';
                    e.target.style.borderColor = '#0077d4';
                  }
                }}
                onMouseLeave={e => {
                  if (page !== p) {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#f1f1f1';
                  }
                }}
              >{p}</button>
          )}
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              background: page === totalPages ? '#f1f1f1' : '#0077d4',
              color: page === totalPages ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: 6,
              width: 32,
              height: 32,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'Poppins, sans-serif'
            }}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      )}

      {/* Page Info */}
      {filteredUsers.length > 0 && (
        <div style={{
          textAlign: 'center',
          marginTop: '1rem',
          fontSize: '14px',
          color: '#6b7280',
          fontWeight: 400,
          padding: '0.75rem',
          background: '#ffffff',
          borderRadius: 6,
          border: '1px solid #f1f1f1',
          fontFamily: 'Poppins, sans-serif'
        }}>
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} entries
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
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
          zIndex: 1000,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0077d4 0%, #0056b3 100%)',
              color: '#ffffff',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fas fa-envelope" style={{ fontSize: '18px' }}></i>
                </div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 600
                  }}>
                    Send Email
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    opacity: 0.9
                  }}>
                    Send email to {userDetails?.UserName || userDetails?.ClientName || 'User'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailData({ subject: '', message: '' });
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <i className="fas fa-times" style={{ fontSize: '14px' }}></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Subject Field */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#4b5563',
                  marginBottom: '6px'
                }}>
                  Subject <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={e => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Message Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#4b5563',
                  marginBottom: '6px'
                }}>
                  Message <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={emailData.message}
                  onChange={e => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message here..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    resize: 'vertical',
                    minHeight: '100px',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailData({ subject: '', message: '' });
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailData.subject.trim() || !emailData.message.trim()}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '6px',
                    background: (sendingEmail || !emailData.subject.trim() || !emailData.message.trim()) 
                      ? '#9ca3af' : '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: (sendingEmail || !emailData.subject.trim() || !emailData.message.trim()) 
                      ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                  onMouseEnter={e => {
                    if (!sendingEmail && emailData.subject.trim() && emailData.message.trim()) {
                      e.currentTarget.style.background = '#1d4ed8';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!sendingEmail && emailData.subject.trim() && emailData.message.trim()) {
                      e.currentTarget.style.background = '#2563eb';
                    }
                  }}
                >
                  {sendingEmail ? (
                    <>
                      <div style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane" style={{ fontSize: '11px' }}></i>
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Success Popup */}
      {emailSuccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#10b981',
          color: '#ffffff',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1100,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          animation: 'slideInFromRight 0.4s ease-out',
          minWidth: '300px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>
              Email Sent Successfully!
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              The email has been delivered to {userDetails?.UserName || userDetails?.ClientName || 'the client'}
            </div>
          </div>
          <button
            onClick={() => setEmailSuccess(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              marginLeft: 'auto',
              opacity: 0.8,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
          >
            <i className="fas fa-times" style={{ fontSize: '12px' }}></i>
          </button>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes modalSlideIn {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideInFromRight {
          0% {
            opacity: 0;
            transform: translateX(100%);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AdminUsers; 