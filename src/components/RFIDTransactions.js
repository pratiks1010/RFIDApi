import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Header from './Header';
import { rfidService } from '../services/rfidService';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaCloudUploadAlt, FaFileExcel } from 'react-icons/fa';

const RFIDTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    rfidNumber: '',
    itemCode: '',
    categoryId: '',
    productId: '',
    designId: '',
    purityId: '',
    grossWeight: '',
    stoneWeight: '',
    diamondHeight: '',
    netWeight: '',
    boxDetails: '',
    size: 0,
    stoneAmount: '',
    diamondAmount: '',
    hallmarkAmount: '',
    makingPerGram: '',
    makingPercentage: '',
    makingFixedAmount: '',
    mrp: '',
    status: 'ApiActive'
  });

  useEffect(() => {
    const storedUserInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    setUserInfo(storedUserInfo);
    fetchTransactions(storedUserInfo.ClientCode);
  }, []);

  const fetchTransactions = async (clientCode) => {
    setLoading(true);
    try {
      const data = await rfidService.getRFIDTransactions(clientCode, "ApiActive");
      setTransactions(data);
    } catch (error) {
      toast.error('Failed to fetch transactions');
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (rfidNumber, newStatus) => {
    try {
      await rfidService.updateRFIDTransaction({
        clientCode: userInfo.ClientCode,
        rfidNumber,
        status: newStatus
      });
      toast.success('Status updated successfully');
      fetchTransactions(userInfo.ClientCode);
    } catch (error) {
      toast.error('Failed to update status');
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (itemCodes) => {
    if (!window.confirm('Are you sure you want to delete the selected items?')) return;
    
    try {
      await rfidService.deleteLabelledStock(userInfo.ClientCode, itemCodes);
      toast.success('Items deleted successfully');
      fetchTransactions(userInfo.ClientCode);
      setSelectedItems([]);
    } catch (error) {
      toast.error('Failed to delete items');
      console.error('Error deleting items:', error);
    }
  };

  const handleAddItem = async () => {
    try {
      await rfidService.saveRFIDTransaction({
        ...newItem,
        clientCode: userInfo.ClientCode
      });
      toast.success('Item added successfully');
      setShowAddModal(false);
      setNewItem({
        rfidNumber: '',
        itemCode: '',
        categoryId: '',
        productId: '',
        designId: '',
        purityId: '',
        grossWeight: '',
        stoneWeight: '',
        diamondHeight: '',
        netWeight: '',
        boxDetails: '',
        size: 0,
        stoneAmount: '',
        diamondAmount: '',
        hallmarkAmount: '',
        makingPerGram: '',
        makingPercentage: '',
        makingFixedAmount: '',
        mrp: '',
        status: 'ApiActive'
      });
      fetchTransactions(userInfo.ClientCode);
    } catch (error) {
      toast.error('Failed to add item');
      console.error('Error adding item:', error);
    }
  };

  const filteredTransactions = transactions.filter(transaction => 
    transaction.RFIDNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.Itemcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      fontFamily: 'Inter, sans-serif',
      minWidth: 420,
      maxWidth: 500,
      border: '3px solid',
      borderImage: 'linear-gradient(90deg, #0078d4, #4A00E0, #06beb6) 1',
      background: 'linear-gradient(135deg, #e3f0ff 0%, #b3d8ff 60%, #f4e2d8 100%)',
    }}>
      <Header userInfo={userInfo} />
      
      <div className="container-fluid py-4">
        <div className="card shadow-lg border-0" style={{ 
          borderRadius: '15px', 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          overflow: 'hidden'
        }}>
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="fw-bold mb-0" style={{ color: '#333' }}>RFID Transactions</h2>
              <button 
                className="btn btn-primary px-4 py-2"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #4A00E0, #8E2DE2)',
                  border: 'none',
                  borderRadius: '10px',
                  transition: 'all 0.3s ease'
                }}
              >
                <FaPlus className="me-2" /> Add New Item
              </button>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="input-group">
                  <span className="input-group-text" style={{ background: 'transparent', border: '1px solid #dee2e6' }}>
                    <FaSearch className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by RFID or Item Code"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      border: '1px solid #dee2e6',
                      borderLeft: 'none',
                      padding: '0.75rem 1rem'
                    }}
                  />
                </div>
              </div>
              {selectedItems.length > 0 && (
                <button
                  className="btn btn-danger px-4 py-2"
                  onClick={() => handleDelete(selectedItems)}
                  style={{
                    background: 'linear-gradient(135deg, #d60000, #ff0000)',
                    border: 'none',
                    borderRadius: '10px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaTrash className="me-2" /> Delete Selected ({selectedItems.length})
                </button>
              )}
            </div>

            <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              <table className="table table-hover">
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedItems.length === filteredTransactions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(filteredTransactions.map(t => t.Itemcode));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                      />
                    </th>
                    <th>RFID Number</th>
                    <th>Item Code</th>
                    <th>Category</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th style={{ width: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <p className="text-muted mb-0">No transactions found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.RFIDNumber} style={{ transition: 'all 0.2s ease' }}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedItems.includes(transaction.Itemcode)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, transaction.Itemcode]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== transaction.Itemcode));
                              }
                            }}
                          />
                        </td>
                        <td>{transaction.RFIDNumber}</td>
                        <td>{transaction.Itemcode}</td>
                        <td>{transaction.category_id}</td>
                        <td>{transaction.product_id}</td>
                        <td>
                          <span className={`badge ${transaction.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '20px',
                                  fontSize: '0.85rem'
                                }}>
                            {transaction.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => handleUpdateStatus(transaction.RFIDNumber, transaction.status === 'Active' ? 'Sold' : 'Active')}
                            style={{ borderRadius: '8px' }}
                          >
                            <FaEdit className="me-1" /> {transaction.status === 'Active' ? 'Mark Sold' : 'Mark Active'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete([transaction.Itemcode])}
                            style={{ borderRadius: '8px' }}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content" style={{ borderRadius: '15px' }}>
              <div className="modal-header border-bottom-0">
                <h5 className="modal-title fw-bold">Add New RFID Item</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-medium">RFID Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newItem.rfidNumber}
                      onChange={(e) => setNewItem({...newItem, rfidNumber: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Item Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newItem.itemCode}
                      onChange={(e) => setNewItem({...newItem, itemCode: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Category</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newItem.categoryId}
                      onChange={(e) => setNewItem({...newItem, categoryId: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Product</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newItem.productId}
                      onChange={(e) => setNewItem({...newItem, productId: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Design</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newItem.designId}
                      onChange={(e) => setNewItem({...newItem, designId: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Purity</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newItem.purityId}
                      onChange={(e) => setNewItem({...newItem, purityId: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Gross Weight</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newItem.grossWeight}
                      onChange={(e) => setNewItem({...newItem, grossWeight: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Stone Weight</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newItem.stoneWeight}
                      onChange={(e) => setNewItem({...newItem, stoneWeight: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-medium">Net Weight</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newItem.netWeight}
                      onChange={(e) => setNewItem({...newItem, netWeight: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">Box Details</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newItem.boxDetails}
                      onChange={(e) => setNewItem({...newItem, boxDetails: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">MRP</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newItem.mrp}
                      onChange={(e) => setNewItem({...newItem, mrp: e.target.value})}
                      style={{ borderRadius: '8px' }}
                    />
                  </div>
                </div>
                <div style={{
                  color: '#d60000',
                  fontWeight: 500,
                  fontSize: 13,
                  marginBottom: 18,
                  textAlign: 'center'
                }}>
                  Please ensure all mandatory fields are present in your Excel sheet for a successful upload.
                </div>
              </div>
              <div className="modal-footer border-top-0">
                <button 
                  type="button" 
                  className="btn btn-light px-4" 
                  onClick={() => setShowAddModal(false)}
                  style={{ borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary px-4"
                  onClick={handleAddItem}
                  style={{
                    background: 'linear-gradient(135deg, #4A00E0, #8E2DE2)',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFIDTransactions; 
