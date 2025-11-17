import React, { useState, useEffect } from 'react';
import { FaSearch, FaRedo } from 'react-icons/fa';

const AdminUserContactList = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(25);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://rrgold.loyalstring.co.in/api/ContactForm', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contact list');
      }
      
      const data = await response.json();
      setContacts(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch contact list');
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = (contact.Industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (contact.Message?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (contact.Email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (contact.PhoneNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredContacts.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentContacts = filteredContacts.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleRefresh = () => {
    fetchContacts();
  };

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '24px', 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <h1 style={{ 
          fontSize: isMobile ? '20px' : '24px', 
          fontWeight: 600, 
          color: '#101828', 
          margin: '0 0 8px 0' 
        }}>
          User Contact List
        </h1>
        <p style={{ 
          fontSize: isMobile ? '12px' : '14px', 
          color: '#667085', 
          margin: 0 
        }}>
          Manage and track contact form submissions from potential clients
        </p>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: isMobile ? '16px' : '24px',
        gap: isMobile ? '12px' : '16px'
      }}>
        {/* Search */}
        <div style={{ 
          position: 'relative',
          width: isMobile ? '100%' : 'auto',
          flex: isMobile ? 'none' : '1',
          maxWidth: isMobile ? '100%' : '400px'
        }}>
          <FaSearch style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#6b7280',
            fontSize: '14px',
            zIndex: 1
          }} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px 8px 36px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              width: '100%',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          style={{
            background: '#0077d4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: isMobile ? '10px' : '10px 16px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            width: isMobile ? '100%' : 'auto',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0056b3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#0077d4';
          }}
        >
          <FaRedo style={{ fontSize: '12px' }} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #0077d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>Loading contact list...</p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: isMobile ? '600px' : 'auto'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}>
                    Industry
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}>
                    Message
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}>
                    Email
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#374151'
                  }}>
                    Phone Number
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentContacts.map((contact, index) => (
                  <tr 
                    key={contact.Id}
                    style={{ 
                      borderBottom: index < currentContacts.length - 1 ? '1px solid #f3f4f6' : 'none',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      borderRight: '1px solid #f3f4f6',
                      fontWeight: '500'
                    }}>
                      {contact.Industry || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      borderRight: '1px solid #f3f4f6',
                      maxWidth: '300px',
                      wordWrap: 'break-word'
                    }}>
                      {contact.Message || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      borderRight: '1px solid #f3f4f6'
                    }}>
                      {contact.Email || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827'
                    }}>
                      {contact.PhoneNumber || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px',
              gap: '8px',
              background: 'white',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: currentPage === 1 ? '#f9fafb' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Previous
              </button>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: currentPage === page ? '#3b82f6' : 'white',
                      color: currentPage === page ? 'white' : '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                      minWidth: '40px'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: currentPage === totalPages ? '#f9fafb' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Next
              </button>
            </div>
          )}

          {/* Records Count */}
          {!loading && filteredContacts.length > 0 && (
            <div style={{
              padding: '16px 20px',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Showing {startIndex + 1} to {Math.min(endIndex, filteredContacts.length)} of {filteredContacts.length} contacts
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredContacts.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: '#f3f4f6', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <FaSearch style={{ fontSize: '24px', color: '#9ca3af' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#101828', margin: '0 0 8px 0' }}>
            No contacts found
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : 'No contact submissions available'
            }
          </p>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminUserContactList;
