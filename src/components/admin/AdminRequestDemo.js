import React, { useState, useEffect } from 'react';
import { FaSearch, FaRedo, FaEye, FaCheck, FaTimes } from 'react-icons/fa';

const AdminRequestDemo = () => {
  const [demoRequests, setDemoRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(25);

  useEffect(() => {
    fetchDemoRequests();
  }, []);

  const fetchDemoRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://rrgold.loyalstring.co.in/api/DemoRequest', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch demo requests');
      }
      
      const data = await response.json();
      setDemoRequests(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch demo requests');
      console.error('Error fetching demo requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = demoRequests.filter(request => {
    const matchesSearch = (request.FullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (request.Email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (request.PhoneNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (request.CompanyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (request.BusinessType?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sort by ID or CreatedDate in descending order (newest first)
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    // Try to sort by CreatedDate if available, otherwise by Id
    if (a.CreatedDate && b.CreatedDate) {
      return new Date(b.CreatedDate) - new Date(a.CreatedDate);
    }
    if (a.CreatedDate) return -1;
    if (b.CreatedDate) return 1;
    // Fallback to ID if no date
    return (b.Id || 0) - (a.Id || 0);
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedRequests.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRequests = sortedRequests.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  const handleRefresh = () => {
    fetchDemoRequests();
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '24px', 
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 600, 
          color: '#101828', 
          margin: '0 0 8px 0' 
        }}>
          Request for Demo
        </h1>
        <p style={{ 
          fontSize: '14px', 
          color: '#667085', 
          margin: 0 
        }}>
          Manage and track demo requests from potential clients
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
              placeholder="Search requests..."
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
          <p style={{ color: '#6b7280' }}>Loading demo requests...</p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          width: '100%'
        }}>
          <div style={{ 
            overflowX: 'auto',
            width: '100%',
            WebkitOverflowScrolling: 'touch'
          }}>
            {isMobile ? (
              // Mobile Card View
              <div style={{ padding: '12px' }}>
                {currentRequests.map((request) => (
                  <div key={request.Id} style={{
                    background: '#f9fafb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Full Name</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                        {request.FullName || 'N/A'}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Email</div>
                      <div style={{ fontSize: '14px', color: '#111827', wordBreak: 'break-word' }}>
                        {request.Email || 'N/A'}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Phone</div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {request.PhoneNumber || 'N/A'}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Business Type</div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {request.BusinessType || 'N/A'}
                      </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Company</div>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {request.CompanyName || 'N/A'}
                      </div>
                    </div>
                    {request.AdditionalRequirements && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Requirements</div>
                        <div style={{ fontSize: '14px', color: '#111827', wordBreak: 'break-word' }}>
                          {request.AdditionalRequirements}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Desktop Table View
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
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
                    Full Name
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
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}>
                    Phone Number
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}>
                    Business Type
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}>
                    Company Name
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#374151'
                  }}>
                    Additional Requirements
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentRequests.map((request, index) => (
                  <tr 
                    key={request.Id}
                    style={{ 
                      borderBottom: index < currentRequests.length - 1 ? '1px solid #f3f4f6' : 'none',
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
                      {request.FullName || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      borderRight: '1px solid #f3f4f6'
                    }}>
                      {request.Email || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      borderRight: '1px solid #f3f4f6'
                    }}>
                      {request.PhoneNumber || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      borderRight: '1px solid #f3f4f6'
                    }}>
                      {request.BusinessType || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      borderRight: '1px solid #f3f4f6'
                    }}>
                      {request.CompanyName || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '14px', 
                      color: '#111827',
                      maxWidth: '200px',
                      wordWrap: 'break-word'
                    }}>
                      {request.AdditionalRequirements || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>

          {/* Pagination - Always at bottom of table container */}
          {sortedRequests.length > 0 && totalPages > 1 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '20px',
            background: 'white',
            borderTop: '1px solid #e5e7eb',
            alignItems: 'center'
          }}>
          {/* Records Count */}
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              Showing {startIndex + 1} to {Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
            </div>
            
            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: currentPage === 1 ? '#f9fafb' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                <span>‹</span> Previous
              </button>
              
              {/* Page Numbers */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = page === 1 || 
                                 page === totalPages || 
                                 (page >= currentPage - 2 && page <= currentPage + 2);
                  
                  if (!showPage) {
                    // Show ellipsis
                    if (page === currentPage - 3 || page === currentPage + 3) {
                      return (
                        <span key={page} style={{ padding: '8px 4px', color: '#9ca3af' }}>
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        background: currentPage === page ? '#0077d4' : 'white',
                        color: currentPage === page ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: currentPage === page ? 600 : 500,
                        minWidth: '40px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#0077d4';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: currentPage === totalPages ? '#f9fafb' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                Next <span>›</span>
              </button>
            </div>
          </div>
        )}

        {/* Records Count - Show when pagination is not shown (single page) */}
        {sortedRequests.length > 0 && totalPages <= 1 && (
          <div style={{
            padding: '16px 20px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            fontSize: '14px',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Showing {sortedRequests.length} request{sortedRequests.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      )}

      {/* Empty State */}
      {!loading && sortedRequests.length === 0 && (
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
            No demo requests found
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : 'No demo requests available'
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

export default AdminRequestDemo;
