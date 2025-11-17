import React from 'react';

const thirdPartyUsers = [
  { id: 1, name: 'Third Party Org 1', clientCode: 'TP001' },
  { id: 2, name: 'Third Party Org 2', clientCode: 'TP002' },
];

const sparkleUsers = [
  { id: 1, name: 'Sparkle Org 1', clientCode: 'SP001' },
  { id: 2, name: 'Sparkle Org 2', clientCode: 'SP002' },
];

const tableStyle = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(37,99,235,0.08)',
  border: '1.5px solid #e0e7ef',
  padding: '1.5rem 1rem',
  minWidth: 320,
  flex: 1,
  margin: '0 12px',
  fontFamily: 'Inter, Poppins, sans-serif',
};

const AdminRfidTagsReport = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #e0e7ff 0%, #f4f7fd 60%, #e0e7ff 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, Poppins, sans-serif',
      padding: '2rem',
    }}>
      <h2 style={{ color: '#2563eb', fontWeight: 700, marginBottom: 32, fontSize: 24 }}>RFID Tags Report</h2>
      <div style={{ display: 'flex', gap: 32, width: '100%', maxWidth: 900 }}>
        {/* Left Table: Third Party Users */}
        <div style={tableStyle}>
          <h3 style={{ color: '#64748b', fontWeight: 600, fontSize: 18, marginBottom: 18 }}>RFID Third Party Users</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ color: '#2563eb', fontWeight: 600 }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Organization Name</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Client Code</th>
                <th style={{ textAlign: 'center', padding: '8px 4px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {thirdPartyUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                  <td style={{ padding: '8px 4px' }}>{user.name}</td>
                  <td style={{ padding: '8px 4px' }}>{user.clientCode}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <button style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 16px',
                      fontWeight: 500,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}>View RFID Tags</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Right Table: Sparkle Users */}
        <div style={tableStyle}>
          <h3 style={{ color: '#64748b', fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Sparkle Users</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ color: '#2563eb', fontWeight: 600 }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Organization Name</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Client Code</th>
                <th style={{ textAlign: 'center', padding: '8px 4px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sparkleUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                  <td style={{ padding: '8px 4px' }}>{user.name}</td>
                  <td style={{ padding: '8px 4px' }}>{user.clientCode}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <button style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 16px',
                      fontWeight: 500,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}>View RFID Tags</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRfidTagsReport; 