import React, { useState } from 'react';
import { FaCode, FaBook, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const APIDocumentation = () => {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Comprehensive list of all APIs used in the dashboard
  const allAPIs = [
    // Product Master APIs
    {
      id: 'save-transaction',
      name: 'Add Stock',
      endpoint: 'SaveRFIDTransactionDetails',
      method: 'POST',
      baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
      description: 'Save new RFID transaction details with complete product information including weights, pricing, and status.',
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
        diamondweight: "0.250",
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
      },
      responseFormat: {
        message: "Success",
        data: {}
      }
    },
    {
      id: 'update-transaction',
      name: 'Update Stock',
      endpoint: 'UpdateRFIDTransactionDetails',
      method: 'POST',
      baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
      description: 'Update existing RFID transaction details. Can update any field of an existing stock item.',
      sampleBody: {
        client_code: "LS000123",
        RFIDNumber: "CZ3506",
        Itemcode: "SAU124",
        status: "Sold"
      },
      responseFormat: {
        message: "Success",
        data: {}
      }
    },
    {
      id: 'update-existing-products',
      name: 'Update Existing Products',
      endpoint: 'UpdateExistingProducts',
      method: 'POST',
      baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
      description: 'Update one or more existing product/labelled stock items. Send an array of objects; each must include client_code, RFIDNumber, and itemcode. All other fields are optional—only include fields you want to change.',
      sampleBody: [
        {
          client_code: "LS000123",
          RFIDNumber: "CZ3506",
          itemcode: "SAU124",
          category_id: "Gold",
          product_id: "Tops",
          design_id: "Fancy Top",
          purity_id: "22CT",
          branch_id: "Branch1",
          counter_id: "Counter1",
          grosswt: "20.800",
          netwt: "19.250",
          stonewt: "0.500",
          stoneamount: "20",
          diamondAmount: "20",
          diamondWeight: "0.250",
          box_details: "Box A",
          MRP: "5000",
          HallmarkAmount: "35",
          MakingPerGram: "10",
          MakingPercentage: "5",
          MakingFixedAmt: "37",
          status: "ApiActive"
        }
      ],
      responseFormat: {
        status: "success",
        message: "Product details updated successfully."
      }
    },
    {
      id: 'get-transaction',
      name: 'Get Stock Details',
      endpoint: 'GetRFIDTransactionDetails',
      method: 'POST',
      baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all RFID transaction details for a client code with optional status filter.',
      sampleBody: {
        client_code: "LS000123",
        status: "ApiActive"
      },
      responseFormat: [
        {
          "RFIDNumber": "CZ3506",
          "Itemcode": "SAU124",
          "category_id": "Gold",
          "product_id": "Tops",
          "status": "ApiActive"
        }
      ]
    },
    {
      id: 'delete-labelled-stock',
      name: 'Delete Labelled Stock Items',
      endpoint: 'DeleteLabelledStockItems',
      method: 'POST',
      baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
      description: 'Delete specific labelled stock items by providing their item codes.',
      sampleBody: {
        ClientCode: "LS000123",
        ItemCodes: ["SAU124", "SAU125"]
      },
      responseFormat: {
        message: "Success",
        deletedCount: 2
      }
    },
    {
      id: 'delete-all-stock',
      name: 'Delete All Stock for Client',
      endpoint: 'DeleteAllStockForClient',
      method: 'DELETE',
      baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
      description: 'Delete all stock items for a specific client. Use with caution as this is irreversible.',
      sampleBody: null,
      urlParams: '?ClientCode=LS000123',
      responseFormat: {
        message: "All stock deleted successfully"
      }
    },
    {
      id: 'delete-all-sold-stock',
      name: 'Delete All Sold Stock',
      endpoint: 'DeleteAllSoldStockForClient',
      method: 'POST',
      baseUrl: 'https://soni.loyalstring.co.in/api/ProductMaster',
      description: 'Delete all sold stock items for a specific client.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        message: "All sold stock deleted successfully"
      }
    },
    {
      id: 'get-all-labeled-stock',
      name: 'Get All Labeled Stock',
      endpoint: 'GetAllLabeledStock',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all labeled stock items with pagination support.',
      sampleBody: {
        ClientCode: "LS000123",
        PageNumber: 1,
        PageSize: 25
      },
      responseFormat: {
        data: [],
        totalRecords: 100,
        totalPages: 4
      }
    },
    {
      id: 'get-all-stock-android',
      name: 'Get All Stock (Android)',
      endpoint: 'GetAllStockAndroid',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all stock data optimized for Android applications.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    {
      id: 'get-all-product-master',
      name: 'Get All Product Master',
      endpoint: 'GetAllProductMaster',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all product master data for dropdowns and selections.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    {
      id: 'get-all-design',
      name: 'Get All Design',
      endpoint: 'GetAllDesign',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all design master data.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    {
      id: 'get-all-category',
      name: 'Get All Category',
      endpoint: 'GetAllCategory',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all category master data.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    {
      id: 'stock-verification',
      name: 'Stock Verification by Session',
      endpoint: 'GetAllStockVerificationBySession',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Get all stock verification sessions with matched and unmatched items.',
      sampleBody: {
        ClientCode: "LS000123",
        ScanBatchId: "optional_batch_id"
      },
      responseFormat: [
        {
          "SessionNumber": "1",
          "StartedOn": "2024-01-01T10:00:00",
          "EndedOn": "2024-01-01T11:00:00",
          "MatchedItems": 150,
          "UnmatchedItems": 5,
        }
      ]
    },
    {
      id: 'tag-usage',
      name: 'Get Used/Unused RFID Tags',
      endpoint: 'GetAllUsedAndUnusedTag',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all used and unused RFID tags with counts.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        "Used": ["RFID1", "RFID2"],
        "Unused": ["RFID3", "RFID4"],
        "UsedCount": 350,
        "UnusedCount": 180
      }
    },
    // RFID Device APIs
    {
      id: 'get-all-rfid-details',
      name: 'Get All RFID Device Details',
      endpoint: 'GetAllRFIDDetails',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDDevice',
      description: 'Retrieve all RFID device details including device IDs, status, and location information.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: [
          {
            "DeviceId": "DEV001",
            "Status": "Active",
            "Location": "Warehouse A",
          }
        ]
      }
    },
    {
      id: 'delete-rfid-by-device',
      name: 'Delete RFID by Client and Device',
      endpoint: 'DeleteRFIDByClientAndDevice',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDDevice',
      description: 'Delete RFID data for a specific client and device combination.',
      sampleBody: {
        ClientCode: "LS000123",
        DeviceId: "DEV001"
      },
      responseFormat: {
        message: "RFID data deleted successfully"
      }
    },
    // RFID Label Template APIs
    {
      id: 'add-template',
      name: 'Add Label Template',
      endpoint: 'AddTemplate',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate',
      description: 'Create a new RFID label template.',
      sampleBody: {
        ClientCode: "LS000123",
        TemplateName: "Standard Label",
        TemplateData: {}
      },
      responseFormat: {
        message: "Template created successfully",
        templateId: "TMP001"
      }
    },
    {
      id: 'get-all-templates',
      name: 'Get All Templates',
      endpoint: 'GetAllTemplates',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate',
      description: 'Retrieve all label templates for a client.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    {
      id: 'get-template-by-id',
      name: 'Get Template by ID',
      endpoint: 'GetTemplateById',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate',
      description: 'Retrieve a specific template by its ID.',
      sampleBody: {
        ClientCode: "LS000123",
        TemplateId: "TMP001"
      },
      responseFormat: {
        data: {}
      }
    },
    {
      id: 'update-template',
      name: 'Update Template',
      endpoint: 'UpdateTemplate',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate',
      description: 'Update an existing label template.',
      sampleBody: {
        TemplateId: "TMP001",
        TemplateName: "Updated Label",
        TemplateData: {}
      },
      responseFormat: {
        message: "Template updated successfully"
      }
    },
    {
      id: 'delete-template',
      name: 'Delete Template',
      endpoint: 'DeleteTemplate',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate',
      description: 'Delete a label template.',
      sampleBody: {
        ClientCode: "LS000123",
        TemplateId: "TMP001"
      },
      responseFormat: {
        message: "Template deleted successfully"
      }
    },
    {
      id: 'generate-labels',
      name: 'Generate Labels',
      endpoint: 'GenerateLabels',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate',
      description: 'Generate RFID labels based on template and data.',
      sampleBody: {
        ClientCode: "LS000123",
        TemplateId: "TMP001",
        Items: []
      },
      responseFormat: {
        message: "Labels generated successfully",
        downloadUrl: "..."
      }
    },
    // Client Onboarding APIs
    {
      id: 'get-all-counters',
      name: 'Get All Counters',
      endpoint: 'GetAllCounters',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ClientOnboarding',
      description: 'Retrieve all counter information for a client.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    {
      id: 'get-all-branch-master',
      name: 'Get All Branch Master',
      endpoint: 'GetAllBranchMaster',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ClientOnboarding',
      description: 'Retrieve all branch master data.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    // Export APIs
    {
      id: 'send-label-stock-email',
      name: 'Send Label Stock Email',
      endpoint: 'SendLabelStockEmail',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/Export',
      description: 'Send labeled stock data via email in Excel or PDF format.',
      sampleBody: {
        ClientCode: "LS000123",
        EmailAddress: "user@example.com",
        Format: "Excel", // or "PDF"
        Filters: {}
      },
      responseFormat: {
        message: "Email sent successfully"
      }
    },
    {
      id: 'get-all-rfid',
      name: 'Get All RFID',
      endpoint: 'GetAllRFID',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Retrieve all RFID tags for a client.',
      sampleBody: {
        ClientCode: "LS000123"
      },
      responseFormat: {
        data: []
      }
    },
    {
      id: 'update-client-tid-value',
      name: 'Update Client TID Value',
      endpoint: 'UpdateClientTidValue',
      method: 'POST',
      baseUrl: 'https://rrgold.loyalstring.co.in/api/ProductMaster',
      description: 'Update the TID (Tag ID) value for RFID tags.',
      sampleBody: {
        ClientCode: "LS000123",
        RFIDNumber: "RFID001",
        TIDValue: "TID123456"
      },
      responseFormat: {
        message: "TID value updated successfully"
      }
    }
  ];

  const baseUrls = [
    { name: 'Product Master API', url: 'https://soni.loyalstring.co.in/api/ProductMaster' },
    { name: 'RRGold Product Master API', url: 'https://rrgold.loyalstring.co.in/api/ProductMaster' },
    { name: 'RFID Device API', url: 'https://rrgold.loyalstring.co.in/api/RFIDDevice' },
    { name: 'RFID Label Template API', url: 'https://rrgold.loyalstring.co.in/api/RFIDLabelTemplate' },
    { name: 'Client Onboarding API', url: 'https://rrgold.loyalstring.co.in/api/ClientOnboarding' },
    { name: 'Export API', url: 'https://rrgold.loyalstring.co.in/api/Export' }
  ];

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '24px'
            }}>
              <FaBook />
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#1e293b',
                margin: 0,
                letterSpacing: '-0.02em'
              }}>Complete API Documentation</h1>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '16px',
                color: '#64748b'
              }}>Comprehensive guide for third-party integration with all endpoints, payloads, and responses</p>
            </div>
          </div>
        </div>

        {/* Integration Guidelines */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FaCode style={{ color: '#2563eb' }} />
            Integration Guidelines
          </h2>
          
          <div style={{
            background: '#f8fafc',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Authentication</h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', marginBottom: '16px' }}>
              All API endpoints require authentication using Bearer token in the Authorization header:
            </p>
            <pre style={{
              background: '#1e293b',
              color: '#e2e8f0',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '13px',
              overflowX: 'auto',
              marginBottom: '20px'
            }}>
{`Authorization: Bearer <your_token>
Content-Type: application/json`}
            </pre>

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', marginTop: '24px' }}>Base URLs</h3>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: '1.8', paddingLeft: '20px', marginBottom: '20px' }}>
              {baseUrls.map((base, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>
                  <strong>{base.name}:</strong> <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>{base.url}</code>
                </li>
              ))}
            </ul>

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', marginTop: '24px' }}>Client Code Security</h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', marginBottom: '20px' }}>
              All requests are secured with your unique client code. You can only make requests with your own client code. 
              The client code is automatically validated and locked to your account for security.
            </p>

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', marginTop: '24px' }}>Error Handling</h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', marginBottom: '12px' }}>
              All endpoints return standard HTTP status codes:
            </p>
            <ul style={{ fontSize: '14px', color: '#475569', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li><strong>200 OK:</strong> Request successful</li>
              <li><strong>400 Bad Request:</strong> Invalid request parameters</li>
              <li><strong>401 Unauthorized:</strong> Invalid or expired token</li>
              <li><strong>403 Forbidden:</strong> Client code mismatch</li>
              <li><strong>500 Internal Server Error:</strong> Server error</li>
            </ul>
          </div>
        </div>

        {/* All API Endpoints */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '24px'
          }}>All API Endpoints ({allAPIs.length})</h2>
          
          {allAPIs.map((api, idx) => {
            const isExpanded = expandedSections[api.id];
            return (
              <div key={api.id} style={{
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => toggleSection(api.id)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: isExpanded ? '#f8fafc' : '#ffffff',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: api.method === 'POST' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : api.method === 'GET' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>
                      {api.method === 'POST' ? 'POST' : api.method === 'GET' ? 'GET' : 'DEL'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#1e293b',
                        margin: 0,
                        marginBottom: '4px'
                      }}>{api.name}</h3>
                      <code style={{
                        background: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#475569'
                      }}>{api.baseUrl}/{api.endpoint}{api.urlParams || ''}</code>
                    </div>
                  </div>
                  {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>

                {isExpanded && (
                  <div style={{
                    padding: '24px',
                    background: '#ffffff',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <p style={{
                      fontSize: '14px',
                      color: '#64748b',
                      lineHeight: '1.6',
                      marginBottom: '20px'
                    }}>{api.description}</p>

                    {api.sampleBody && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '12px'
                        }}>Request Payload</h4>
                        <pre style={{
                          background: '#1e293b',
                          color: '#e2e8f0',
                          padding: '16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          overflowX: 'auto',
                          margin: 0
                        }}>
                          {JSON.stringify(api.sampleBody, null, 2)}
                        </pre>
                      </div>
                    )}

                    {api.urlParams && !api.sampleBody && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#1e293b',
                          marginBottom: '12px'
                        }}>URL Parameters</h4>
                        <p style={{
                          fontSize: '14px',
                          color: '#475569',
                          background: '#f8fafc',
                          padding: '12px',
                          borderRadius: '8px',
                          fontFamily: 'monospace'
                        }}>
                          {api.baseUrl}/{api.endpoint}{api.urlParams}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#1e293b',
                        marginBottom: '12px'
                      }}>Response Format</h4>
                      <div style={{
                        background: '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <pre style={{ margin: 0, fontSize: '13px', color: '#475569', whiteSpace: 'pre-wrap' }}>
                          {typeof api.responseFormat === 'string' 
                            ? api.responseFormat 
                            : JSON.stringify(api.responseFormat, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Code Examples */}
                    <div style={{ marginTop: '24px' }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#1e293b',
                        marginBottom: '12px'
                      }}>Code Examples</h4>
                      
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>JavaScript (Fetch API)</h5>
                        <pre style={{
                          background: '#1e293b',
                          color: '#e2e8f0',
                          padding: '16px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          overflowX: 'auto',
                          margin: 0
                        }}>
{api.sampleBody ? `const response = await fetch('${api.baseUrl}/${api.endpoint}${api.urlParams || ''}', {
  method: '${api.method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(${JSON.stringify(api.sampleBody, null, 2)})
});

const data = await response.json();` : `const response = await fetch('${api.baseUrl}/${api.endpoint}${api.urlParams || ''}', {
  method: '${api.method}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const data = await response.json();`}
                        </pre>
                      </div>

                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>cURL</h5>
                        <pre style={{
                          background: '#1e293b',
                          color: '#e2e8f0',
                          padding: '16px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          overflowX: 'auto',
                          margin: 0
                        }}>
{api.sampleBody ? `curl -X ${api.method} '${api.baseUrl}/${api.endpoint}${api.urlParams || ''}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '${JSON.stringify(api.sampleBody)}'` : `curl -X ${api.method} '${api.baseUrl}/${api.endpoint}${api.urlParams || ''}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN'`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default APIDocumentation;

