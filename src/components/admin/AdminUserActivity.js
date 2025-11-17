import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { FaBuilding, FaEye } from 'react-icons/fa';
import SparkleUserDetails from './SparkleUserDetails';

const PAGE_SIZE = 16;
const ZOHO_COLORS = [
  '#1A73E8', '#34A853', '#F9AB00', '#E94235', '#A142F4', '#24C1E0', '#F44292', '#00BFAE', '#FF7043', '#8D6E63'
];
const ZOHO_FONT = 'Inter, Segoe UI, Arial, sans-serif';

const getAvatarColor = (idx) => ZOHO_COLORS[idx % ZOHO_COLORS.length];

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d)) return 'N/A';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AdminUserActivity = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsData, setUserDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Admin/GetAllSparkleClientOnboarding', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch Sparkle ERP users');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and paginated users
  const filteredUsers = users.filter(user =>
    (user.UserName || user.ClientName || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.OrganisationName || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.ClientCode || '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pageData = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Split users for two tables
  const mid = Math.ceil(pageData.length / 2);
  const leftTable = pageData.slice(0, mid);
  const rightTable = pageData.slice(mid);

  const handleExport = () => {
    if (!filteredUsers.length) return;
    const exportData = filteredUsers.map(user => ({
      'Client Code': user.ClientCode || '',
      'User Name': user.UserName || user.ClientName || '',
      'Password': user.Password || '',
      'Organization Name': user.OrganisationName || '',
      'Email': user.ClientEmail || user.Email || '',
      'City': user.City || '',
      'Mobile': user.Mobile || '',
      'Status': user.Status || '',
      'Created Date': user.CreatedDate || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sparkle ERP Users');
    XLSX.writeFile(wb, 'Sparkle_ERP_Users.xlsx');
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // Pagination UI (Zoho style, with ellipsis and entry count)
  const renderPagination = () => {
    const pageButtons = [];
    const maxPagesToShow = 4;
    let startPage = Math.max(1, page - 1);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    for (let p = startPage; p <= endPage; p++) {
      pageButtons.push(p);
    }
    return (
      <div style={{ width: '100%', marginTop: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '7px 16px',
              fontWeight: 700,
              fontSize: 16,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {startPage > 1 && (
            <button
              onClick={() => handlePageChange(1)}
              style={{
                background: '#fff',
                color: '#1A73E8',
                border: '1.5px solid #E3EAFD',
                borderRadius: 8,
                padding: '7px 16px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                fontFamily: ZOHO_FONT,
                transition: 'all 0.2s',
              }}
            >1</button>
          )}
          {startPage > 2 && (
            <span style={{ color: '#A0AEC0', fontWeight: 700, fontSize: 18, padding: '0 4px' }}>...</span>
          )}
          {pageButtons.map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              style={{
                background: p === page ? '#1A73E8' : '#fff',
                color: p === page ? '#fff' : '#1A73E8',
                border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                borderRadius: 8,
                padding: '7px 16px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                fontFamily: ZOHO_FONT,
                boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                transition: 'all 0.2s',
              }}
            >{p}</button>
          ))}
          {endPage < totalPages - 1 && (
            <span style={{ color: '#A0AEC0', fontWeight: 700, fontSize: 18, padding: '0 4px' }}>...</span>
          )}
          {endPage < totalPages && (
            <button
              onClick={() => handlePageChange(totalPages)}
              style={{
                background: '#fff',
                color: '#1A73E8',
                border: '1.5px solid #E3EAFD',
                borderRadius: 8,
                padding: '7px 16px',
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                fontFamily: ZOHO_FONT,
                transition: 'all 0.2s',
              }}
            >{totalPages}</button>
          )}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 16px',
              fontWeight: 700,
              fontSize: 16,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ borderBottom: '1.5px solid #E3EAFD', margin: '18px 0 0 0', width: '100%' }} />
        <div style={{ textAlign: 'center', color: '#7b8a9b', fontSize: 17, fontWeight: 500, margin: '18px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filteredUsers.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filteredUsers.length)} of ${filteredUsers.length} entries`}
        </div>
      </div>
    );
  };

  // Handler for view details
  const handleViewDetails = async (user) => {
    setDetailsLoading(true);
    setDetailsError('');
    setUserDetailsData(null);
    try {
      const clientCode = user.ClientCode;
      const payload = { ClientCode: clientCode };
      const token = localStorage.getItem('adminToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      // List of endpoints
      const endpoints = [
        'https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCompanyDetails',
        'https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBranchMaster',
        'https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllEmployee',
        'https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllBankMaster',
        'https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllCustomer',
        'https://rrgold.loyalstring.co.in/api/Reports/saleReports',
      ];
      const keys = [
        'companyDetails',
        'branchMaster',
        'employee',
        'bankMaster',
        'customer',
        'saleReports',
      ];
      // Fire all requests in parallel
      const results = await Promise.all(
        endpoints.map((url) =>
          fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          }).then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        )
      );
      // Map results to keys
      const detailsData = {};
      keys.forEach((k, i) => { detailsData[k] = results[i]; });
      setUserDetailsData(detailsData);
      setSelectedUser(user);
    } catch (err) {
      setDetailsError('Failed to fetch user details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Table row rendering (Zoho style, as in image)
  const renderTableRows = (tableData, offset = 0) =>
    tableData.map((user, idx) => {
      const color = getAvatarColor(idx + offset);
      const status = (user.Status || '').toLowerCase();
      let btnColor = '#1A73E8', btnBg = '#fff', btnBorder = '#1A73E8', btnText = '#1A73E8';
      if (status === 'active') { btnColor = '#34A853'; btnBorder = '#34A853'; btnText = '#34A853'; }
      else if (status === 'pending') { btnColor = '#F9AB00'; btnBorder = '#F9AB00'; btnText = '#F9AB00'; }
      else if (status === 'inactive') { btnColor = '#E94235'; btnBorder = '#E94235'; btnText = '#E94235'; }
      return (
        <tr key={user.ClientCode || idx} style={{ borderBottom: '1px solid #F0F1F3', background: idx % 2 === 0 ? '#fff' : '#F8FAFC', transition: 'background 0.2s' }}>
          {/* User */}
          <td style={{ padding: '16px 12px', minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: color, color: '#fff', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase' }}>
                {(user.UserName || user.ClientName || 'U').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#222', marginBottom: 2 }}>{user.UserName || user.ClientName || 'N/A'}</div>
                <div style={{ fontSize: 13, color: '#7b8a9b', fontWeight: 400 }}>{user.OrganisationName || 'N/A'}</div>
              </div>
            </div>
          </td>
          {/* Details */}
          <td style={{ padding: '16px 12px', minWidth: 180, fontWeight: 500, color: '#38414a', fontSize: 15 }}>
            <div style={{ fontWeight: 600, color: '#1A73E8', fontSize: 15 }}>{user.ClientCode || 'N/A'}</div>
            <div style={{ fontSize: 13, color: '#7b8a9b', fontWeight: 400 }}>{user.Mobile || 'No phone'}</div>
          </td>
          {/* Actions */}
          <td style={{ padding: '16px 12px', minWidth: 120 }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: btnBg,
              color: btnText,
              border: `1.5px solid ${btnBorder}`,
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: btnColor !== '#1A73E8' ? `0 1px 3px ${btnColor}20` : 'none',
            }}
            onClick={() => handleViewDetails(user)}
            >
              <FaEye style={{ color: btnColor, fontSize: 16 }} />
              View Details
            </button>
          </td>
        </tr>
      );
    });

  if (detailsLoading) {
    return (
      <div style={{ padding: 80, textAlign: 'center', fontSize: 22, color: '#1A73E8', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
        Loading user details...
      </div>
    );
  }
  if (detailsError) {
    return (
      <div style={{ padding: 80, textAlign: 'center', fontSize: 20, color: '#E94235', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
        {detailsError}
      </div>
    );
  }
  if (selectedUser && userDetailsData) {
    return (
      <SparkleUserDetails user={selectedUser} userDetailsData={userDetailsData} onBack={() => { setSelectedUser(null); setUserDetailsData(null); }} />
    );
  }

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px', 
      maxWidth: '100vw', 
      margin: '0 auto', 
      fontFamily: ZOHO_FONT,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Zoho-style header card */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(26, 115, 232, 0.06)',
        padding: isMobile ? '20px 16px' : '32px 32px 18px 32px',
        marginBottom: 18,
        border: '1.5px solid #E3EAFD',
        width: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '16px' : 18,
        minHeight: isMobile ? 'auto' : 70,
      }}>
        {/* Title and count */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center', 
          gap: isMobile ? '8px' : 18,
          width: isMobile ? '100%' : 'auto'
        }}>
          <span style={{ 
            fontSize: isMobile ? '1.5rem' : '2.2rem', 
            fontWeight: 900, 
            color: '#222', 
            letterSpacing: '-1px', 
            fontFamily: ZOHO_FONT, 
            display: 'flex', 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <FaBuilding style={{ marginRight: 13, fontSize: isMobile ? 24 : 32, verticalAlign: 'middle', color: '#1A73E8' }} />
            Sparkle ERP Users
          </span>
          <span style={{ 
            fontSize: isMobile ? 14 : 17, 
            color: '#7b8a9b', 
            fontWeight: 500, 
            marginLeft: isMobile ? 0 : 2, 
            marginTop: isMobile ? 0 : 4 
          }}>
            {filteredUsers.length} users • Page {page} of {totalPages}
          </span>
        </div>
        {/* Search and Export */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center', 
          gap: isMobile ? '12px' : 16, 
          flex: isMobile ? 'none' : 1, 
          justifyContent: isMobile ? 'stretch' : 'flex-end',
          width: isMobile ? '100%' : 'auto'
        }}>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: isMobile ? '100%' : 260,
              maxWidth: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: '1.5px solid #E3EAFD',
              fontSize: isMobile ? 14 : 16,
              fontFamily: ZOHO_FONT,
              outline: 'none',
              background: '#F8FAFC',
              color: '#101828',
              fontWeight: 400,
              boxShadow: '0 1px 3px #E3EAFD40',
              marginRight: isMobile ? 0 : 10,
              boxSizing: 'border-box'
            }}
          />
          <button
            onClick={handleExport}
            style={{
              background: '#34A853',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: isMobile ? '11px 20px' : '11px 28px',
              fontWeight: 700,
              fontSize: isMobile ? 14 : 16,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: ZOHO_FONT,
              boxShadow: '0 1px 3px #34A85330',
              width: isMobile ? '100%' : 'auto',
              whiteSpace: 'nowrap'
            }}
          >Export</button>
        </div>
      </div>
      {/* Main card with tables */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(26, 115, 232, 0.07)',
        padding: isMobile ? '16px' : '32px',
        minHeight: 200,
        marginBottom: isMobile ? 16 : 32,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 32,
        border: '1.5px solid #E3EAFD',
        width: '100%',
        maxWidth: '100vw',
        fontFamily: ZOHO_FONT
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: isMobile ? 16 : 20, padding: isMobile ? '40px 0' : '60px 0', fontFamily: ZOHO_FONT }}>Loading users...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', color: '#E94235', fontSize: isMobile ? 16 : 18, padding: isMobile ? '40px 0' : '60px 0', fontFamily: ZOHO_FONT }}>{error}</div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 16 : 32, 
            width: '100%' 
          }}>
            {/* Left Table */}
            <div style={{ 
              flex: 1, 
              background: '#F8FAFC', 
              borderRadius: 12, 
              border: '1px solid #E3EAFD', 
              overflow: 'hidden', 
              minWidth: isMobile ? 'auto' : 350,
              width: '100%',
              overflowX: 'auto'
            }}>
              <div style={{ background: '#F5F7FA', padding: '16px 24px', borderBottom: '1px solid #E3EAFD', fontWeight: 700, color: '#1A73E8', fontSize: 16, fontFamily: ZOHO_FONT }}>
                Users (1 - {mid})
              </div>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                fontFamily: ZOHO_FONT, 
                background: '#F8FAFC',
                minWidth: isMobile ? '600px' : 'auto'
              }}>
                <thead>
                  <tr style={{ background: '#F5F7FA', borderBottom: '1px solid #E3EAFD' }}>
                    <th style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'left', fontWeight: 700, color: '#7b8a9b', fontSize: isMobile ? 12 : 14, letterSpacing: '0.5px' }}>USER</th>
                    <th style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'left', fontWeight: 700, color: '#7b8a9b', fontSize: isMobile ? 12 : 14, letterSpacing: '0.5px' }}>DETAILS</th>
                    <th style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'left', fontWeight: 700, color: '#7b8a9b', fontSize: isMobile ? 12 : 14, letterSpacing: '0.5px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows(leftTable, 0)}
                </tbody>
              </table>
            </div>
            {/* Right Table */}
            <div style={{ 
              flex: 1, 
              background: '#F8FAFC', 
              borderRadius: 12, 
              border: '1px solid #E3EAFD', 
              overflow: 'hidden', 
              minWidth: isMobile ? 'auto' : 350,
              width: '100%',
              display: isMobile ? 'none' : 'block',
              overflowX: 'auto'
            }}>
              <div style={{ background: '#F5F7FA', padding: '16px 24px', borderBottom: '1px solid #E3EAFD', fontWeight: 700, color: '#1A73E8', fontSize: 16, fontFamily: ZOHO_FONT }}>
                Users ({mid + 1} - {pageData.length})
              </div>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                fontFamily: ZOHO_FONT, 
                background: '#F8FAFC',
                minWidth: isMobile ? '600px' : 'auto'
              }}>
                <thead>
                  <tr style={{ background: '#F5F7FA', borderBottom: '1px solid #E3EAFD' }}>
                    <th style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'left', fontWeight: 700, color: '#7b8a9b', fontSize: isMobile ? 12 : 14, letterSpacing: '0.5px' }}>USER</th>
                    <th style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'left', fontWeight: 700, color: '#7b8a9b', fontSize: isMobile ? 12 : 14, letterSpacing: '0.5px' }}>DETAILS</th>
                    <th style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'left', fontWeight: 700, color: '#7b8a9b', fontSize: isMobile ? 12 : 14, letterSpacing: '0.5px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows(rightTable, mid)}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {totalPages > 1 && renderPagination()}
      </div>
    </div>
  );
};

export default AdminUserActivity; 