import React, { useState, useEffect } from 'react';
import LiveMetalTicker from './LiveMetalTicker';

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

const AdminHome = ({ users, erpUsers }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State and filtered data for RFID table on Home
  const [rfidHomeSearch, setRfidHomeSearch] = useState('');
  const [rfidHomePage, setRfidHomePage] = useState(1);
  const rfidHomePageSize = 10;

  const filteredRfidHomeUsers = users.filter(u =>
    (u.UserName?.toLowerCase().includes(rfidHomeSearch.toLowerCase()) ||
      u.ClientCode?.toLowerCase().includes(rfidHomeSearch.toLowerCase()))
  );

  const rfidHomeTotalPages = Math.ceil(filteredRfidHomeUsers.length / rfidHomePageSize);
  const rfidHomePageData = filteredRfidHomeUsers.slice((rfidHomePage - 1) * rfidHomePageSize, rfidHomePage * rfidHomePageSize);

  // State and filtered data for Sparkle ERP table on Home
  const [erpHomeSearch, setErpHomeSearch] = useState('');
  const [erpHomePage, setErpHomePage] = useState(1);
  const erpHomePageSize = 15;

  const filteredErpHomeUsersHome = erpUsers.filter(u =>
    ((u.UserName || u.ClientName || '').toLowerCase().includes(erpHomeSearch.toLowerCase()) ||
      (u.ClientCode || '').toLowerCase().includes(erpHomeSearch.toLowerCase()))
  );

  const erpHomeTotalPages = Math.ceil(filteredErpHomeUsersHome.length / erpHomePageSize);
  const erpHomePageData = filteredErpHomeUsersHome.slice((erpHomePage - 1) * erpHomePageSize, erpHomePage * erpHomePageSize);

  return (
    <div style={{
      color: '#101828',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      width: '100%',
      minHeight: 'calc(100vh - 72px)',
      background: '#f9fafb',
      padding: isMobile ? '16px' : '24px 32px',
      paddingTop: isMobile ? '20px' : '32px',
      paddingBottom: isMobile ? '20px' : '32px',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Live Metal Ticker - Right below header */}
      {!isMobile && <LiveMetalTicker />}

      {/* Compact Dashboard Overview */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e4e7ec',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
        padding: isMobile ? '12px 16px' : '16px 24px',
        marginBottom: isMobile ? '16px' : '24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '16px' : '0'
      }}>
        {/* Dashboard Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: isMobile ? '100%' : 'auto'
        }}>
          <div style={{
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            background: '#0077d4',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <i className="fas fa-chart-bar" style={{ fontSize: isMobile ? '14px' : '16px', color: '#ffffff' }}></i>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: '600',
              color: '#101828',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              Admin Dashboard Overview
            </div>
            {!isMobile && (
              <div style={{
                fontSize: '12px',
                color: '#667085',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                User statistics and system overview
              </div>
            )}
          </div>
        </div>

        {/* User Stats in Single Line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '12px' : '32px',
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-end'
        }}>
          {/* RFID Users */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            padding: isMobile ? '8px 12px' : '12px 16px',
            background: '#f8faff',
            borderRadius: '6px',
            border: '1px solid #e1effe',
            flex: isMobile ? '1' : '0 1 auto',
            minWidth: isMobile ? 'calc(33.333% - 8px)' : 'auto'
          }}>
            <div style={{
              width: isMobile ? '28px' : '36px',
              height: isMobile ? '28px' : '36px',
              background: '#0077d4',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className="fas fa-users" style={{ fontSize: isMobile ? '12px' : '16px', color: '#ffffff' }}></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isMobile ? '18px' : '24px',
                fontWeight: '700',
                color: '#0077d4',
                lineHeight: '1',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                {users.length}
              </div>
              <div style={{
                fontSize: isMobile ? '10px' : '12px',
                fontWeight: '500',
                color: '#0077d4',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                whiteSpace: 'nowrap'
              }}>
                RFID Users
              </div>
            </div>
          </div>

          {/* ERP Users */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            padding: isMobile ? '8px 12px' : '12px 16px',
            background: '#f7f8f9',
            borderRadius: '6px',
            border: '1px solid #e4e7ec',
            flex: isMobile ? '1' : '0 1 auto',
            minWidth: isMobile ? 'calc(33.333% - 8px)' : 'auto'
          }}>
            <div style={{
              width: isMobile ? '28px' : '36px',
              height: isMobile ? '28px' : '36px',
              background: '#38414a',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className="fas fa-building" style={{ fontSize: isMobile ? '12px' : '16px', color: '#ffffff' }}></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isMobile ? '18px' : '24px',
                fontWeight: '700',
                color: '#38414a',
                lineHeight: '1',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                {erpUsers.length}
              </div>
              <div style={{
                fontSize: isMobile ? '10px' : '12px',
                fontWeight: '500',
                color: '#38414a',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                whiteSpace: 'nowrap'
              }}>
                ERP Users
              </div>
            </div>
          </div>

          {/* Total Count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            padding: isMobile ? '8px 12px' : '12px 16px',
            background: '#f0fdf4',
            borderRadius: '6px',
            border: '1px solid #dcfce7',
            flex: isMobile ? '1' : '0 1 auto',
            minWidth: isMobile ? 'calc(33.333% - 8px)' : 'auto'
          }}>
            <div style={{
              width: isMobile ? '28px' : '36px',
              height: isMobile ? '28px' : '36px',
              background: '#16a34a',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className="fas fa-chart-line" style={{ fontSize: isMobile ? '12px' : '16px', color: '#ffffff' }}></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isMobile ? '18px' : '24px',
                fontWeight: '700',
                color: '#16a34a',
                lineHeight: '1',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                {users.length + erpUsers.length}
              </div>
              <div style={{
                fontSize: isMobile ? '10px' : '12px',
                fontWeight: '500',
                color: '#16a34a',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                whiteSpace: 'nowrap'
              }}>
                Total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Section - Side by Side */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: isMobile ? '16px' : '24px', 
        minHeight: isMobile ? '400px' : '500px',
        width: '100%'
      }}>
        {/* RFID Third Party Users Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
          border: '1px solid #e4e7ec',
          display: 'flex',
          flexDirection: 'column',
          minHeight: isMobile ? '300px' : '400px',
          maxHeight: isMobile ? '600px' : 'calc(100vh - 380px)',
          overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            background: '#f9fafb',
            color: '#344054',
            padding: '16px 20px',
            fontWeight: 600,
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            borderBottom: '1px solid #e4e7ec'
          }}>
            <i className="fas fa-users" style={{ fontSize: 16, color: '#0077d4' }}></i>
            RFID Third Party Users ({users.length})
          </div>

          {/* Search Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e7ec' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#667085',
                fontSize: 14
              }}>
                <i className="fas fa-search"></i>
              </div>
              <input
                type="text"
                placeholder="Search by username or client code..."
                value={rfidHomeSearch}
                onChange={e => {
                  setRfidHomeSearch(e.target.value);
                  setRfidHomePage(1);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  background: '#ffffff',
                  color: '#101828',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 400
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0077d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Table Content */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: '200px' }}>
            {rfidHomePageData.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#666',
                fontSize: '0.9rem'
              }}>
                <i className="fas fa-users" style={{ fontSize: 48, marginBottom: 16, color: '#0077d4', opacity: 0.3 }}></i>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No RFID users found</div>
                <div>Try adjusting your search criteria</div>
              </div>
            ) : (
              isMobile ? (
                // Mobile Card View
                <div style={{ padding: '12px' }}>
                  {rfidHomePageData.map((user, index) => (
                    <div key={index} style={{
                      background: '#f9fafb',
                      borderRadius: 8,
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #e4e7ec'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500, marginBottom: '4px' }}>Username</div>
                        <div style={{ fontSize: '14px', color: '#101828', fontWeight: 500 }}>{user.UserName || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500, marginBottom: '4px' }}>Client Code</div>
                        <div style={{ fontSize: '13px', color: '#667085', fontWeight: 400 }}>{user.ClientCode || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop Table View
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#667085', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e4e7ec', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                        Username
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#667085', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e4e7ec', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                        Client Code
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfidHomePageData.map((user, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid #f2f4f7',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px', fontSize: '14px', color: '#101828', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 500, verticalAlign: 'middle' }}>
                          {user.UserName || 'N/A'}
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#667085', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 400, verticalAlign: 'middle' }}>
                          {user.ClientCode || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          {/* Pagination */}
          {rfidHomeTotalPages > 1 && (
            <div style={{
              padding: '1rem',
              borderTop: '1px solid rgba(0, 119, 212, 0.1)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              background: '#f1f1f1'
            }}>
              <button
                onClick={() => setRfidHomePage(Math.max(1, rfidHomePage - 1))}
                disabled={rfidHomePage === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: rfidHomePage === 1 ? '#f5f5f5' : '#0077d4',
                  color: rfidHomePage === 1 ? '#999' : '#fff',
                  cursor: rfidHomePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              {getPagination(rfidHomePage, rfidHomeTotalPages).map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && setRfidHomePage(page)}
                  disabled={page === '...'}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: page === rfidHomePage ? '#0077d4' : page === '...' ? 'transparent' : '#f1f1f1',
                    color: page === rfidHomePage ? '#fff' : page === '...' ? '#999' : '#0077d4',
                    cursor: page === '...' ? 'default' : 'pointer',
                    fontSize: '12px',
                    fontWeight: page === rfidHomePage ? 500 : 400,
                    fontFamily: 'Poppins, sans-serif',
                    minWidth: 32
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setRfidHomePage(Math.min(rfidHomeTotalPages, rfidHomePage + 1))}
                disabled={rfidHomePage === rfidHomeTotalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: rfidHomePage === rfidHomeTotalPages ? '#f5f5f5' : '#0077d4',
                  color: rfidHomePage === rfidHomeTotalPages ? '#999' : '#fff',
                  cursor: rfidHomePage === rfidHomeTotalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>

        {/* Sparkle ERP Users Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
          border: '1px solid #e4e7ec',
          display: 'flex',
          flexDirection: 'column',
          minHeight: isMobile ? '300px' : '400px',
          maxHeight: isMobile ? '600px' : 'calc(100vh - 380px)',
          overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            background: '#f9fafb',
            color: '#344054',
            padding: '16px 20px',
            fontWeight: 600,
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            borderBottom: '1px solid #e4e7ec'
          }}>
            <i className="fas fa-building" style={{ fontSize: 16, color: '#38414a' }}></i>
            Sparkle ERP Users ({erpUsers.length})
          </div>

          {/* Search Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e7ec' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#667085',
                fontSize: 14
              }}>
                <i className="fas fa-search"></i>
              </div>
              <input
                type="text"
                placeholder="Search by name or client code..."
                value={erpHomeSearch}
                onChange={e => {
                  setErpHomeSearch(e.target.value);
                  setErpHomePage(1);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  background: '#ffffff',
                  color: '#101828',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 400
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#38414a';
                  e.target.style.boxShadow = '0 0 0 3px rgba(56, 65, 74, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Table Content */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: '200px' }}>
            {erpHomePageData.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#666',
                fontSize: '0.9rem'
              }}>
                <i className="fas fa-building" style={{ fontSize: 48, marginBottom: 16, color: '#38414a', opacity: 0.3 }}></i>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No ERP users found</div>
                <div>Try adjusting your search criteria</div>
              </div>
            ) : (
              isMobile ? (
                // Mobile Card View
                <div style={{ padding: '12px' }}>
                  {erpHomePageData.map((user, index) => (
                    <div key={index} style={{
                      background: '#f9fafb',
                      borderRadius: 8,
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #e4e7ec'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500, marginBottom: '4px' }}>Name</div>
                        <div style={{ fontSize: '14px', color: '#101828', fontWeight: 500 }}>{user.UserName || user.ClientName || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#667085', fontWeight: 500, marginBottom: '4px' }}>Client Code</div>
                        <div style={{ fontSize: '13px', color: '#667085', fontWeight: 400 }}>{user.ClientCode || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop Table View
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#667085', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e4e7ec', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                        Name
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, color: '#667085', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e4e7ec', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                        Client Code
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {erpHomePageData.map((user, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid #f2f4f7',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px', fontSize: '14px', color: '#101828', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 500, verticalAlign: 'middle' }}>
                          {user.UserName || user.ClientName || 'N/A'}
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#667085', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 400, verticalAlign: 'middle' }}>
                          {user.ClientCode || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>

          {/* Pagination */}
          {erpHomeTotalPages > 1 && (
            <div style={{
              padding: '1rem',
              borderTop: '1px solid rgba(56, 65, 74, 0.1)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              background: '#f1f1f1'
            }}>
              <button
                onClick={() => setErpHomePage(Math.max(1, erpHomePage - 1))}
                disabled={erpHomePage === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: erpHomePage === 1 ? '#f5f5f5' : '#38414a',
                  color: erpHomePage === 1 ? '#999' : '#fff',
                  cursor: erpHomePage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>

              {getPagination(erpHomePage, erpHomeTotalPages).map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && setErpHomePage(page)}
                  disabled={page === '...'}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: page === erpHomePage ? '#38414a' : page === '...' ? 'transparent' : '#f1f1f1',
                    color: page === erpHomePage ? '#fff' : page === '...' ? '#999' : '#38414a',
                    cursor: page === '...' ? 'default' : 'pointer',
                    fontSize: '12px',
                    fontWeight: page === erpHomePage ? 500 : 400,
                    fontFamily: 'Poppins, sans-serif',
                    minWidth: 32
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setErpHomePage(Math.min(erpHomeTotalPages, erpHomePage + 1))}
                disabled={erpHomePage === erpHomeTotalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: erpHomePage === erpHomeTotalPages ? '#f5f5f5' : '#38414a',
                  color: erpHomePage === erpHomeTotalPages ? '#999' : '#fff',
                  cursor: erpHomePage === erpHomeTotalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHome; 