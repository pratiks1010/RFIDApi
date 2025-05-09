import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import Header from './Header';
import { rfidService } from '../services/rfidService';

const API_ENDPOINTS = [
  {
    id: 'save-transaction',
    name: 'Save RFID Transaction Details',
    endpoint: 'SaveRFIDTransactionDetails',
    method: 'POST',
    description: 'Save new RFID transaction details with complete product information including weights, pricing, and status.',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-save text-white',
    highlight: 'primary',
    gradient: 'linear-gradient(135deg, #8E2DE2, #4A00E0)',
    sampleBody: {
      client_code: "LS000123",
      branch_id: "string",
      counter_id: "string",
      RFIDNumber: "CZ3506",
      Itemcode: "SAU124",
      category_id: "Gold",
      product_id: "Tops",
      design_id: "Fancy Top",
      purity_id: "22CT",
      grosswt: "20.800",
      stonewt: "0.500",
      diamondheight: "0.250",
      netwt: "19.250",
      box_details: "Box A",
      size: 0,
      stoneamount: "20",
      diamondAmount: "20",
      HallmarkAmount: "35",
      MakingPerGram: "10",
      MakingPercentage: "5",
      MakingFixedAmt: "37",
      MRP: "5000",
      imageurl: "",
      status: "ApiActive"
    }
  },
  {
    id: 'update-transaction',
    name: 'Update RFID Transaction Details',
    endpoint: 'UpdateRFIDTransactionDetails',
    method: 'POST',
    description: 'Update the status of RFID items (e.g., mark as Sold).',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-edit text-white',
    highlight: 'info',
    gradient: 'linear-gradient(135deg, #4A00E0, #8E2DE2)',
    sampleBody: {
      client_code: "LS000186",
      RFIDNumber: "CZ3581",
      Itemcode: "SAU124",
      status: "Sold"
    }
  },
  {
    id: 'get-transaction',
    name: 'Get RFID Transaction Details',
    endpoint: 'GetRFIDTransactionDetails',
    method: 'POST',
    description: 'Retrieve all active RFID transactions for a client.',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-search text-white',
    highlight: 'primary',
    gradient: 'linear-gradient(135deg, #06beb6, #48b1bf)',
    sampleBody: {
      client_code: "LS000186",
      status: "ApiActive"
    }
  },
  {
    id: 'get-all-device',
    name: 'Get All RFID Device Details',
    endpoint: 'GetAllRFIDDetails',
    method: 'POST',
    description: 'Retrieve all RFID device details for the specified device.',
    baseUrl: 'https://soni.loyalstring.co.in/api/RFIDDevice',
    authRequired: true,
    icon: 'fas fa-mobile-alt text-white',
    highlight: 'info',
    gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
    sampleBody: {
      ClientCode: "LS000186",
      DeviceId: "Sai"
    }
  },
  {
    id: 'delete-specific',
    name: 'Delete Specific Stock Items',
    endpoint: 'DeleteLabelledStockItems',
    method: 'POST',
    description: 'Remove specific items from labelled stock inventory.',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-trash-alt text-white',
    highlight: 'danger',
    gradient: 'linear-gradient(135deg, #d60000, #ff0000)',
    sampleBody: {
      ClientCode: "LS000186",
      ItemCodes: ["ITEM001", "ITEM002"]
    }
  },
  {
    id: 'delete-all',
    name: 'Delete All Stock Items',
    endpoint: 'DeleteLabelledStockItems',
    method: 'POST',
    description: 'Remove all items from labelled stock inventory for a client.',
    baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
    authRequired: true,
    icon: 'fas fa-trash text-white',
    highlight: 'danger',
    gradient: 'linear-gradient(135deg, #FF416C, #FF4B2B)',
    sampleBody: {
      ClientCode: "LS000186",
      ItemCodes: []
    }
  },
  {
    id: 'delete-by-client-device',
    name: 'Delete RFID By Client And Device',
    endpoint: 'DeleteRFIDByClientAndDevice',
    method: 'POST',
    description: 'Delete RFID data for a specific client and device combination.',
    baseUrl: 'https://soni.loyalstring.co.in/api/RFIDDevice',
    authRequired: true,
    icon: 'fas fa-trash-alt text-white',
    highlight: 'warning',
    gradient: 'linear-gradient(135deg, #f7b733, #fc4a1a)',
    sampleBody: {
      ClientCode: "LS000186",
      DeviceId: "Sai"
    }
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({});
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestBody, setRequestBody] = useState({});
  const [clientError, setClientError] = useState('');

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    setUserInfo(userInfo);
    
    // Check for authentication
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const handleEndpointClick = (endpoint) => {
    setSelectedEndpoint(endpoint);
    setResponse(null);
    const newRequestBody = { ...endpoint.sampleBody };
    if (newRequestBody.client_code) {
      newRequestBody.client_code = userInfo.ClientCode;
    }
    if (newRequestBody.ClientCode) {
      newRequestBody.ClientCode = userInfo.ClientCode;
    }
    setRequestBody(newRequestBody);
    setClientError('');
  };

  const validateClientCode = (body) => {
    const clientCode = body.client_code || body.ClientCode;
    if (clientCode !== userInfo.ClientCode) {
      setClientError('You can only make requests with your own client code');
      return false;
    }
    setClientError('');
    return true;
  };

  const handleFieldChange = (field, value) => {
    setRequestBody(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return;
    if (!validateClientCode(requestBody)) return;

    setLoading(true);
    try {
      let response;
      const clientCode = userInfo.ClientCode;
      
      switch (selectedEndpoint.endpoint) {
        case 'SaveRFIDTransactionDetails':
        case 'UpdateRFIDTransactionDetails':
          response = await axios.post(
            `${selectedEndpoint.baseUrl}/${selectedEndpoint.endpoint}`,
            [requestBody]
          );
          break;

        case 'GetRFIDTransactionDetails':
          const transactionData = await rfidService.getRFIDTransactions(clientCode);
          response = { data: transactionData };
          break;

        case 'DeleteLabelledStockItems':
          const deleteResponse = await rfidService.deleteLabelledStock(clientCode, requestBody.ItemCodes);
          response = { data: deleteResponse };
          break;

        case 'GetAllRFIDDetails':
        case 'DeleteRFIDByClientAndDevice':
          response = await axios.post(
            `${selectedEndpoint.baseUrl}/${selectedEndpoint.endpoint}`,
            requestBody
          );
          break;

        default:
          throw new Error('Unknown endpoint');
      }

      setResponse(response.data);
      toast.success('API call successful!', {
        toastId: 'api-success',
        position: "top-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error.response?.data?.Message || error.message;
      setResponse({ error: errorMessage, details: error.response?.data });
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        navigate('/login?session_expired=true');
        return;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderRequestBodyFields = () => {
    if (!selectedEndpoint) return null;

    // For Delete All Stock Items, only show ClientCode
    if (selectedEndpoint.name === 'Delete All Stock Items') {
      return (
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-medium">ClientCode</label>
            <input
              type="text"
              className="form-control"
              value={requestBody.ClientCode}
              disabled
              style={{ 
                borderRadius: '8px', 
                fontSize: '0.9rem',
                backgroundColor: '#f8f9fa' 
              }}
            />
          </div>
        </div>
      );
    }

    const fields = Object.entries(requestBody);
    return (
      <div className="row g-3">
        {fields.map(([key, value]) => {
          // Special handling for ItemCodes array
          if (key === 'ItemCodes' && Array.isArray(value)) {
            return (
              <div className="col-12" key={key}>
                <label className="form-label fw-medium">{key}</label>
                <input
                  type="text"
                  className="form-control"
                  value={value.join(', ')}
                  onChange={(e) => handleFieldChange(key, e.target.value.split(',').map(item => item.trim()))}
                  placeholder="Enter item codes separated by commas"
                  style={{ borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>
            );
          }

          // Client code field (disabled)
          if (key === 'client_code' || key === 'ClientCode') {
            return (
              <div className="col-md-6" key={key}>
                <label className="form-label fw-medium">{key}</label>
                <input
                  type="text"
                  className="form-control"
                  value={value}
                  disabled
                  style={{ 
                    borderRadius: '8px', 
                    fontSize: '0.9rem',
                    backgroundColor: '#f8f9fa' 
                  }}
                />
              </div>
            );
          }

          // Regular fields
          return (
            <div className="col-md-6" key={key}>
              <label className="form-label fw-medium">{key}</label>
              <input
                type={typeof value === 'number' ? 'number' : 'text'}
                className="form-control"
                value={value}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                style={{ borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 60%, #ececec 100%)',
      fontFamily: 'Poppins, Inter, sans-serif'
    }}>
      <Header userInfo={userInfo} />
      <div className="container" style={{ maxWidth: '1400px', marginTop: 32, marginBottom: 0 }}>
        <div className="row">
          <div className="col-md-4 d-flex align-items-center mb-3 mb-md-0">
            <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'Poppins, Inter, sans-serif', fontWeight: 900, fontSize: '2.1rem', letterSpacing: 0.5, background: 'linear-gradient(90deg, #0078d4 0%, #5470FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 4px 18px #b3d8ff33', lineHeight: 1.1 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ marginRight: 12 }} xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="16" rx="3" fill="#e3f0ff" stroke="#0078d4" strokeWidth="2"/>
                <rect x="7" y="8" width="2.5" height="2.5" rx="1.25" fill="#0078d4"/>
                <rect x="11.75" y="8" width="5.25" height="2.5" rx="1.25" fill="#b3d8ff"/>
                <rect x="7" y="13.5" width="10" height="2.5" rx="1.25" fill="#b3d8ff"/>
              </svg>
              RFID API Dashboard
            </span>
          </div>
        </div>
      </div>
      <div className="container py-4 flex-grow-1" style={{ maxWidth: '1400px' }}>
        <div className="row h-100 g-4">
          <div className="col-md-4">
            <div className="card shadow-lg border-0" style={{ 
              borderRadius: '15px', 
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
            }}>
              <div className="card-body p-4">
                <h5 className="mb-4 fw-bold text-primary">API Endpoints</h5>
                <div className="list-group">
                  {API_ENDPOINTS.map((endpoint) => (
                    <button
                      key={endpoint.id}
                      className={`list-group-item list-group-item-action border-0 mb-3 ${selectedEndpoint?.id === endpoint.id ? 'active' : ''}`}
                      onClick={() => handleEndpointClick(endpoint)}
                      style={{
                        borderRadius: '10px',
                        background: selectedEndpoint?.id === endpoint.id ? endpoint.gradient : 'white',
                        transition: 'all 0.3s ease',
                        transform: selectedEndpoint?.id === endpoint.id ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: selectedEndpoint?.id === endpoint.id ? '0 8px 16px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.05)',
                        fontSize: '0.9rem'
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <div className="me-3" style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: endpoint.gradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <i className={endpoint.icon}></i>
                        </div>
                        <div>
                          <h6 className={`mb-1 ${selectedEndpoint?.id === endpoint.id ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.9rem' }}>
                            {endpoint.name}
                          </h6>
                          <small className={selectedEndpoint?.id === endpoint.id ? 'text-white-50' : 'text-muted'} style={{ fontSize: '0.8rem' }}>
                            {endpoint.method} {endpoint.endpoint}
                          </small>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            {selectedEndpoint ? (
              <div className="card shadow-lg border-0" style={{ 
                borderRadius: '15px', 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
              }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-4">
                    <h5 className="fw-bold mb-0" style={{ color: '#333' }}>
                      {selectedEndpoint.name}
                    </h5>
                    <span className="badge bg-primary ms-2" style={{ fontSize: '0.8rem' }}>{selectedEndpoint.method}</span>
                  </div>
                  
                  <div className="mb-4">
                    <h6 className="fw-bold mb-2" style={{ fontSize: '0.9rem' }}>Description</h6>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{selectedEndpoint.description}</p>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold mb-3" style={{ fontSize: '0.9rem' }}>Request Body</h6>
                    <div className="position-relative" style={{ 
                      maxHeight: '400px', 
                      overflowY: 'auto',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '10px',
                      border: '1px solid #dee2e6'
                    }}>
                      {renderRequestBodyFields()}
                      {clientError && (
                        <div className="alert alert-danger mt-3" style={{ fontSize: '0.85rem' }}>
                          {clientError}
                        </div>
                      )}
                      <div className="alert alert-info mt-3" style={{ fontSize: '0.85rem' }}>
                        <i className="fas fa-info-circle me-2"></i>
                        Client code is locked to your account for security
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary px-4 py-2"
                    onClick={handleTestEndpoint}
                    disabled={loading}
                    style={{
                      background: selectedEndpoint.gradient,
                      border: 'none',
                      borderRadius: '10px',
                      transition: 'all 0.3s ease',
                      fontSize: '0.9rem'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Send Request
                      </>
                    )}
                  </button>

                  <div className={`mt-4`}>
                    <h6 className="fw-bold mb-3" style={{ fontSize: '0.9rem' }}>Response</h6>
                    <div className="response-container" style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '10px',
                      border: '1px solid #dee2e6',
                      overflow: 'hidden'
                    }}>
                      {loading ? (
                        <div style={{ 
                          padding: '2rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '1rem'
                        }}>
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.9rem' }}>Processing request...</div>
                        </div>
                      ) : response ? (
                        <>
                          <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{
                            background: response.error ? 'rgba(220, 53, 69, 0.1)' : 'linear-gradient(90deg, #f8f9fa 0%, #ffffff 100%)'
                          }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge ${response.error ? 'bg-danger' : 'bg-success'}`} style={{ 
                                padding: '0.5rem 1rem', 
                                fontSize: '0.8rem' 
                              }}>
                                {response.error ? 'ERROR' : 'SUCCESS'}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                                {response.error ? 'Request failed' : 'Response received'}
                              </span>
                            </div>
                            <button 
                              className="btn btn-sm btn-light" 
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(response, null, 2));
                                toast.success('Response copied to clipboard', {
                                  toastId: 'copy-response'
                                });
                              }}
                              style={{
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                padding: '0.4rem 0.8rem'
                              }}
                            >
                              <i className="fas fa-copy me-1"></i> Copy
                            </button>
                          </div>
                          <div className="p-3" style={{ 
                            maxHeight: '400px',
                            overflowY: 'auto',
                            background: '#ffffff' 
                          }}>
                            {response.error ? (
                              <div className="alert alert-danger mb-0" style={{ fontSize: '0.85rem' }}>
                                <h6 className="alert-heading fw-bold mb-2">Error Details</h6>
                                <p className="mb-1">{response.error}</p>
                                {response.details && (
                                  <pre className="mt-2 mb-0" style={{ fontSize: '0.8rem' }}>
                                    {JSON.stringify(response.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ) : Array.isArray(response) ? (
                              <div className="table-responsive">
                                <table className="table table-hover" style={{ fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr>
                                      {Object.keys(response[0] || {}).map(key => (
                                        <th key={key} style={{ 
                                          position: 'sticky',
                                          top: 0,
                                          background: '#f8f9fa',
                                          whiteSpace: 'nowrap',
                                          padding: '0.75rem'
                                        }}>{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {response.map((item, i) => (
                                      <tr key={i}>
                                        {Object.values(item).map((value, j) => (
                                          <td key={j} style={{ 
                                            padding: '0.75rem',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '200px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}>
                                            {value?.toString() || '-'}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div className="p-3 bg-light border-top">
                                  <small className="text-muted">Total items: {response.length}</small>
                                </div>
                              </div>
                            ) : (
                              <pre style={{ 
                                margin: 0,
                                fontSize: '0.85rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {JSON.stringify(response, null, 2)}
                              </pre>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ 
                          padding: '2rem', 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '1rem',
                          color: '#666'
                        }}>
                          <div style={{ fontSize: '2rem' }}>📡</div>
                          <div style={{ fontSize: '0.9rem' }}>Send a request to see the response here</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card shadow-lg border-0" style={{ 
                borderRadius: '15px', 
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                height: '100%'
              }}>
                <div className="card-body p-4">
                  <div className="text-center mb-4">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto',
                      background: 'linear-gradient(135deg, #0078d4 0%, #5470FF 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '20px'
                    }}>
                      <i className="fas fa-shield-alt text-white" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h4 className="fw-bold mb-3">Secure RFID Integration</h4>
                    <p className="text-muted mb-4">Select an endpoint from the left to start making secure API requests for your RFID operations.</p>
                  </div>

                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-save text-primary me-2"></i>
                          <h6 className="mb-0">Save Transactions</h6>
                        </div>
                        <p className="text-muted small mb-0">Securely save new RFID transaction details with complete product information.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-edit text-info me-2"></i>
                          <h6 className="mb-0">Update Status</h6>
                        </div>
                        <p className="text-muted small mb-0">Update transaction status and manage your RFID inventory efficiently.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-search text-success me-2"></i>
                          <h6 className="mb-0">Get Details</h6>
                        </div>
                        <p className="text-muted small mb-0">Retrieve and view all active RFID transactions with detailed information.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-mobile-alt text-info me-2"></i>
                          <h6 className="mb-0">Device Management</h6>
                        </div>
                        <p className="text-muted small mb-0">Get and manage RFID device details for specific devices.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-trash text-danger me-2"></i>
                          <h6 className="mb-0">Stock Management</h6>
                        </div>
                        <p className="text-muted small mb-0">Delete specific or all items from your labelled stock inventory.</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 h-100" style={{ 
                        background: '#f8f9fa', 
                        borderRadius: '10px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        height: '100%'
                      }} onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#4A00E0';
                      }} onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          <i className="fas fa-trash-alt text-warning me-2"></i>
                          <h6 className="mb-0">Device Cleanup</h6>
                        </div>
                        <p className="text-muted small mb-0">Remove RFID data for specific client and device combinations.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4" style={{ 
                    background: 'linear-gradient(135deg, #0078d4 0%, #5470FF 100%)',
                    borderRadius: '10px',
                    color: 'white',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }} onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(74, 0, 224, 0.2)';
                  }} onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div className="d-flex align-items-center">
                      <i className="fas fa-lock me-3" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <h6 className="mb-1">Secure Client Code Integration</h6>
                        <p className="mb-0 small">All endpoints are secured with your client code for maximum security and data protection.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer 
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        draggable
        theme="light"
        limit={1}
        toastStyle={{
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif'
        }}
      />
    </div>
  );
};

export default Dashboard;