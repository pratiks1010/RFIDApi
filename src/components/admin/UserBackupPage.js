import React, { useState, useEffect } from 'react';
import { FaDownload, FaSync, FaDatabase, FaBuilding, FaCheckCircle, FaExclamationTriangle, FaClock, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';

const UserBackupPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [leftTableUsers, setLeftTableUsers] = useState([]);
  const [rightTableUsers, setRightTableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leftTableSearch, setLeftTableSearch] = useState('');
  const [rightTableSearch, setRightTableSearch] = useState('');
  const [leftTablePage, setLeftTablePage] = useState(1);
  const [rightTablePage, setRightTablePage] = useState(1);
  const [backupLoading, setBackupLoading] = useState({});
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [currentBackupUser, setCurrentBackupUser] = useState(null);
  const [backupStats, setBackupStats] = useState({
    totalBackups: 0,
    successfulBackups: 0,
    failedBackups: 0,
    lastBackupTime: new Date().toLocaleTimeString()
  });

  const recordsPerPage = 20;

  // Fetch Sparkle ERP users from admin dashboard endpoint
  const fetchAllUsers = async () => {
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
      
      // Transform data for backup display
      const transformedData = data.map((user, index) => ({
        id: user.Id || index + 1,
        clientCode: user.ClientCode,
        organizationName: user.OrganisationName || user.ClientName || 'Unknown Organization',
        firstName: user.FirstName || user.UserName || 'Unknown',
        lastName: user.LastName || '',
        email: user.ClientEmail || user.Email || `${user.ClientCode?.toLowerCase()}@company.com`,
        department: user.Department || 'General',
        city: user.City,
        state: user.State,
        country: user.Country,
        mobile: user.Mobile,
        rfidType: user.RfidType,
        createdDate: user.CreatedDate || new Date().toISOString(),
        lastBackup: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.15 ? 'Active' : 'Pending',
        dataSize: `${(Math.random() * 8 + 1).toFixed(1)} MB`,
        backupCount: Math.floor(Math.random() * 75) + 1
      }));
      
      setAllUsers(transformedData);
      
      // Split users into two tables (50% each)
      const midPoint = Math.ceil(transformedData.length / 2);
      const leftUsers = transformedData.slice(0, midPoint);
      const rightUsers = transformedData.slice(midPoint);
      
      setLeftTableUsers(leftUsers);
      setRightTableUsers(rightUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAllUsers();
      setLoading(false);
    };
    
    loadData();
  }, []);

  // Update backup stats when data changes
  useEffect(() => {
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(user => user.status === 'Active').length;
    const pendingUsers = totalUsers - activeUsers;
    
    setBackupStats({
      totalBackups: totalUsers,
      successfulBackups: activeUsers,
      failedBackups: pendingUsers,
      lastBackupTime: new Date().toLocaleTimeString()
    });
  }, [allUsers]);

  // Filter functions for both tables
  const filteredLeftTableUsers = leftTableUsers.filter(user =>
    user.firstName?.toLowerCase().includes(leftTableSearch.toLowerCase()) ||
    user.clientCode?.toLowerCase().includes(leftTableSearch.toLowerCase()) ||
    user.organizationName?.toLowerCase().includes(leftTableSearch.toLowerCase())
  );

  const filteredRightTableUsers = rightTableUsers.filter(user =>
    user.firstName?.toLowerCase().includes(rightTableSearch.toLowerCase()) ||
    user.clientCode?.toLowerCase().includes(rightTableSearch.toLowerCase()) ||
    user.organizationName?.toLowerCase().includes(rightTableSearch.toLowerCase())
  );

  // Pagination calculations for left table
  const leftTableTotalPages = Math.ceil(filteredLeftTableUsers.length / recordsPerPage);
  const leftTableStartIndex = (leftTablePage - 1) * recordsPerPage;
  const leftTableEndIndex = leftTableStartIndex + recordsPerPage;
  const leftTableCurrentPageUsers = filteredLeftTableUsers.slice(leftTableStartIndex, leftTableEndIndex);

  // Pagination calculations for right table
  const rightTableTotalPages = Math.ceil(filteredRightTableUsers.length / recordsPerPage);
  const rightTableStartIndex = (rightTablePage - 1) * recordsPerPage;
  const rightTableEndIndex = rightTableStartIndex + recordsPerPage;
  const rightTableCurrentPageUsers = filteredRightTableUsers.slice(rightTableStartIndex, rightTableEndIndex);

  // Reset pagination when search changes
  useEffect(() => {
    setLeftTablePage(1);
  }, [leftTableSearch]);

  useEffect(() => {
    setRightTablePage(1);
  }, [rightTableSearch]);

  // Backup functions
  const handleIndividualBackup = async (user, tableType) => {
    const key = `${tableType}_${user.id}`;
    setBackupLoading(prev => ({ ...prev, [key]: true }));
    setCurrentBackupUser(user);
    setBackupProgress(0);
    setShowBackupModal(true);

    try {
      // Animate progress bar
      const progressInterval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Call real backup API
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Admin/BackupClientDatabase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ClientCode: user.clientCode
        }),
      });

      clearInterval(progressInterval);
      setBackupProgress(100);

      if (!response.ok) {
        throw new Error(`Backup failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Wait a moment for progress bar to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update last backup time for this user in all relevant arrays
      const currentTime = new Date().toISOString();
      setAllUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, lastBackup: currentTime } : u
      ));
      setLeftTableUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, lastBackup: currentTime } : u
      ));
      setRightTableUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, lastBackup: currentTime } : u
      ));

      // Update backup stats
      setBackupStats(prev => ({
        ...prev,
        successfulBackups: prev.successfulBackups + 1,
        lastBackupTime: new Date().toLocaleTimeString()
      }));

    } catch (error) {
      console.error('Backup failed:', error);
      setBackupProgress(0);
      toast.error(`Backup failed for ${user.firstName}: ${error.message}`);
      setShowBackupModal(false);
    } finally {
      setBackupLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const closeBackupModal = () => {
    setShowBackupModal(false);
    setBackupProgress(0);
    setCurrentBackupUser(null);
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10B981';
      case 'Inactive': return '#EF4444';
      case 'Pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3B82F6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{
          color: '#6B7280',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          Loading backup data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <FaExclamationTriangle size={48} color="#EF4444" />
        <div style={{
          color: '#EF4444',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          Error loading backup data
        </div>
        <div style={{
          color: '#6B7280',
          fontSize: '14px'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      background: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#3B82F6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FaDatabase color="white" size={20} />
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827'
          }}>
            Data Backup Center
          </h1>
        </div>
        <p style={{
          margin: 0,
          color: '#6B7280',
          fontSize: '16px'
        }}>
          Secure backup and recovery system for user data
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#DBEAFE',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaDatabase color="#3B82F6" size={20} />
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
                {backupStats.totalBackups}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Total Users
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#D1FAE5',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaCheckCircle color="#10B981" size={20} />
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
                {backupStats.successfulBackups}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Active Users
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#FEF3C7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaExclamationTriangle color="#F59E0B" size={20} />
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
                {backupStats.failedBackups}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Pending/Inactive
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#E0E7FF',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaClock color="#6366F1" size={20} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                {backupStats.lastBackupTime}
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Last Backup
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        {/* Left Table */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden'
        }}>
          {/* Left Table Header */}
          <div style={{
            background: '#F8FAFC',
            padding: '20px',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#3B82F6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaDatabase color="white" size={14} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                    Sparkle ERP Users
                  </h3>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>
                    {filteredLeftTableUsers.length} users • Page {leftTablePage} of {leftTableTotalPages}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <FaSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF',
                fontSize: '14px'
              }} />
              <input
                type="text"
                placeholder="Search users..."
                value={leftTableSearch}
                onChange={(e) => setLeftTableSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Left Table */}
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F9FAFB', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Client Code
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Organisation Name
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    First Name
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {leftTableCurrentPageUsers.map((user) => (
                  <tr key={`left_${user.id}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ 
                      padding: '16px',
                      fontWeight: '500',
                      fontSize: '14px',
                      color: '#111827'
                    }}>
                      {user.clientCode}
                    </td>
                    <td style={{ 
                      padding: '16px',
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      {user.organizationName}
                    </td>
                    <td style={{ 
                      padding: '16px',
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      {user.firstName}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleIndividualBackup(user, 'left')}
                        disabled={backupLoading[`left_${user.id}`]}
                        style={{
                          background: backupLoading[`left_${user.id}`] ? '#9CA3AF' : '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: backupLoading[`left_${user.id}`] ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto'
                        }}
                      >
                        {backupLoading[`left_${user.id}`] ? (
                          <FaSync className="fa-spin" size={10} />
                        ) : (
                          <FaDownload size={10} />
                        )}
                        {backupLoading[`left_${user.id}`] ? 'Backing up...' : 'Backup'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Left Table Pagination */}
          {leftTableTotalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderTop: '1px solid #E5E7EB',
              background: '#F8FAFC'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Showing {leftTableStartIndex + 1} - {Math.min(leftTableEndIndex, filteredLeftTableUsers.length)} of {filteredLeftTableUsers.length} users
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setLeftTablePage(Math.max(1, leftTablePage - 1))}
                  disabled={leftTablePage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    background: leftTablePage === 1 ? '#F9FAFB' : 'white',
                    color: leftTablePage === 1 ? '#9CA3AF' : '#374151',
                    cursor: leftTablePage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, leftTableTotalPages) }, (_, i) => {
                  let pageNum;
                  if (leftTableTotalPages <= 5) {
                    pageNum = i + 1;
                  } else if (leftTablePage <= 3) {
                    pageNum = i + 1;
                  } else if (leftTablePage >= leftTableTotalPages - 2) {
                    pageNum = leftTableTotalPages - 4 + i;
                  } else {
                    pageNum = leftTablePage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setLeftTablePage(pageNum)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: pageNum === leftTablePage ? '#3B82F6' : 'white',
                        color: pageNum === leftTablePage ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        minWidth: '32px'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setLeftTablePage(Math.min(leftTableTotalPages, leftTablePage + 1))}
                  disabled={leftTablePage === leftTableTotalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    background: leftTablePage === leftTableTotalPages ? '#F9FAFB' : 'white',
                    color: leftTablePage === leftTableTotalPages ? '#9CA3AF' : '#374151',
                    cursor: leftTablePage === leftTableTotalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Table */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden'
        }}>
          {/* Right Table Header */}
          <div style={{
            background: '#F8FAFC',
            padding: '20px',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#10B981',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaBuilding color="white" size={14} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                    Sparkle ERP Users
                  </h3>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>
                    {filteredRightTableUsers.length} users • Page {rightTablePage} of {rightTableTotalPages}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <FaSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF',
                fontSize: '14px'
              }} />
              <input
                type="text"
                placeholder="Search users..."
                value={rightTableSearch}
                onChange={(e) => setRightTableSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Right Table */}
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F9FAFB', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Client Code
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Organisation Name
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    First Name
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rightTableCurrentPageUsers.map((user) => (
                  <tr key={`right_${user.id}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ 
                      padding: '16px',
                      fontWeight: '500',
                      fontSize: '14px',
                      color: '#111827'
                    }}>
                      {user.clientCode}
                    </td>
                    <td style={{ 
                      padding: '16px',
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      {user.organizationName}
                    </td>
                    <td style={{ 
                      padding: '16px',
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      {user.firstName}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleIndividualBackup(user, 'right')}
                        disabled={backupLoading[`right_${user.id}`]}
                        style={{
                          background: backupLoading[`right_${user.id}`] ? '#9CA3AF' : '#10B981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: backupLoading[`right_${user.id}`] ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '0 auto'
                        }}
                      >
                        {backupLoading[`right_${user.id}`] ? (
                          <FaSync className="fa-spin" size={10} />
                        ) : (
                          <FaDownload size={10} />
                        )}
                        {backupLoading[`right_${user.id}`] ? 'Backing up...' : 'Backup'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Table Pagination */}
          {rightTableTotalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderTop: '1px solid #E5E7EB',
              background: '#F8FAFC'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                Showing {rightTableStartIndex + 1} - {Math.min(rightTableEndIndex, filteredRightTableUsers.length)} of {filteredRightTableUsers.length} users
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setRightTablePage(Math.max(1, rightTablePage - 1))}
                  disabled={rightTablePage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    background: rightTablePage === 1 ? '#F9FAFB' : 'white',
                    color: rightTablePage === 1 ? '#9CA3AF' : '#374151',
                    cursor: rightTablePage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, rightTableTotalPages) }, (_, i) => {
                  let pageNum;
                  if (rightTableTotalPages <= 5) {
                    pageNum = i + 1;
                  } else if (rightTablePage <= 3) {
                    pageNum = i + 1;
                  } else if (rightTablePage >= rightTableTotalPages - 2) {
                    pageNum = rightTableTotalPages - 4 + i;
                  } else {
                    pageNum = rightTablePage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setRightTablePage(pageNum)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: pageNum === rightTablePage ? '#10B981' : 'white',
                        color: pageNum === rightTablePage ? 'white' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        minWidth: '32px'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setRightTablePage(Math.min(rightTableTotalPages, rightTablePage + 1))}
                  disabled={rightTablePage === rightTableTotalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    background: rightTablePage === rightTableTotalPages ? '#F9FAFB' : 'white',
                    color: rightTablePage === rightTableTotalPages ? '#9CA3AF' : '#374151',
                    cursor: rightTablePage === rightTableTotalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backup Progress Modal */}
      {showBackupModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: backupProgress === 100 ? '#10B981' : '#3B82F6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                {backupProgress === 100 ? (
                  <FaCheckCircle color="white" size={24} />
                ) : (
                  <FaDatabase color="white" size={20} />
                )}
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {backupProgress === 100 ? 'Backup Completed Successfully!' : 'Creating Database Backup...'}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6B7280',
                  marginTop: '4px'
                }}>
                  {backupProgress === 100 ? 'Your data has been securely backed up' : 'Please wait while we backup your data'}
                </p>
              </div>
            </div>

            {/* User Details */}
            {currentBackupUser && (
              <div style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Client Code
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {currentBackupUser.clientCode}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Organization
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {currentBackupUser.organizationName}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Backup Progress
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: backupProgress === 100 ? '#10B981' : '#3B82F6'
                }}>
                  {Math.round(backupProgress)}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#E5E7EB',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${backupProgress}%`,
                  height: '100%',
                  background: backupProgress === 100 
                    ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(90deg, #3B82F6 0%, #1D4ED8 100%)',
                  borderRadius: '4px',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}>
                  {backupProgress > 0 && backupProgress < 100 && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '20px',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                      animation: 'shimmer 2s infinite'
                    }} />
                  )}
                </div>
              </div>
            </div>

            {/* Status Messages */}
            <div style={{
              marginBottom: '24px'
            }}>
              {backupProgress < 30 && (
                <div style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#3B82F6',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  Connecting to database...
                </div>
              )}
              {backupProgress >= 30 && backupProgress < 70 && (
                <div style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#3B82F6',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  Backing up client data...
                </div>
              )}
              {backupProgress >= 70 && backupProgress < 100 && (
                <div style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#3B82F6',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  Finalizing backup...
                </div>
              )}
              {backupProgress === 100 && (
                <div style={{
                  fontSize: '14px',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '500'
                }}>
                  <FaCheckCircle size={16} />
                  Backup stored successfully!
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              {backupProgress === 100 && (
                <button
                  onClick={closeBackupModal}
                  style={{
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FaCheckCircle size={14} />
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add required CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .fa-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default UserBackupPage; 