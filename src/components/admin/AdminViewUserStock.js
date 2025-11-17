import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

const AdminViewUserStock = ({ clientCode, userName, onBack }) => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [showFilters, setShowFilters] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    purity: '',
    design: '',
    productName: ''
  });
  const [statusUpdating, setStatusUpdating] = useState({});
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null); // item.Id of open dropdown
  const statusDropdownRefs = useRef({});

  const pageSize = 15;

  // Get unique values for filter options
  const getFilterOptions = () => {
    const categories = [...new Set(stockData.map(item => item.CategoryName).filter(Boolean))];
    const statuses = [...new Set(stockData.map(item => item.Status).filter(Boolean))];
    const purities = [...new Set(stockData.map(item => item.PurityName).filter(Boolean))];
    const designs = [...new Set(stockData.map(item => item.DesignName).filter(Boolean))];
    const productNames = [...new Set(stockData.map(item => item.ProductName).filter(Boolean))];
    
    return { categories, statuses, purities, designs, productNames };
  };

  const { categories, statuses, purities, designs, productNames } = getFilterOptions();

  // Filter stock data based on search and filters
  const filteredStock = stockData.filter(item => {
    const searchTerm = search.toLowerCase();
    const matchesSearch = (
      (item.ProductName?.toLowerCase().includes(searchTerm)) ||
      (item.ItemCode?.toLowerCase().includes(searchTerm)) ||
      (item.CategoryName?.toLowerCase().includes(searchTerm)) ||
      (item.RFIDCode?.toLowerCase().includes(searchTerm)) ||
      (item.TIDNumber?.toLowerCase().includes(searchTerm)) ||
      (item.DesignName?.toLowerCase().includes(searchTerm)) ||
      (item.PurityName?.toLowerCase().includes(searchTerm))
    );

    const matchesCategory = !filters.category || item.CategoryName === filters.category;
    const matchesStatus = !filters.status || item.Status === filters.status;
    const matchesPurity = !filters.purity || item.PurityName === filters.purity;
    const matchesDesign = !filters.design || item.DesignName === filters.design;
    const matchesProductName = !filters.productName || item.ProductName === filters.productName;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPurity && matchesDesign && matchesProductName;
  });

  const totalPages = Math.ceil(filteredStock.length / pageSize);
  const pageData = filteredStock.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: '',
      status: '',
      purity: '',
      design: '',
      productName: ''
    });
    setSearch('');
  };

  // Check if any filters are active
  const hasActiveFilters = search || Object.values(filters).some(value => value !== '');

  // Fetch stock data from the new API endpoint
  useEffect(() => {
    fetchStockData();
  }, [clientCode]);

  const fetchStockData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientCode: clientCode })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Stock data received:', data);
      setStockData(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(err.message || 'Error fetching stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!pageData.length) return;
    
    const exportData = pageData.map(item => ({
      'Item Code': item.ItemCode,
      'Product Name': item.ProductName,
      'Category': item.CategoryName,
      'Design': item.DesignName,
      'Purity': item.PurityName,
      'Gross Weight': item.GrossWt,
      'Net Weight': item.NetWt,
      'RFID Code': item.RFIDCode,
      'TID Number': item.TIDNumber,
      'Status': item.Status,
      'Box Name': item.BoxName,
      'Counter': item.CounterName,
      'Created On': item.CreatedOn
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Data');
    XLSX.writeFile(wb, `${userName}_Stock_Data.xlsx`);
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.message.trim()) {
      alert('Please enter both subject and message');
      return;
    }

    setSendingEmail(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Email/SendEmail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientCode: clientCode,
          userName: userName,
          subject: emailData.subject,
          message: emailData.message,
          stockCount: filteredStock.length
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      alert('Email sent successfully!');
      setShowEmailModal(false);
      setEmailData({ subject: '', message: '' });
      
    } catch (err) {
      console.error('Error sending email:', err);
      alert(err.message || 'Error sending email');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatCurrency = (amount) => {
    return amount ? `₹${parseFloat(amount).toLocaleString('en-IN')}` : 'N/A';
  };

  const formatWeight = (weight) => {
    return weight ? `${parseFloat(weight).toFixed(3)}g` : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0001-01-01T00:00:00') return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Get default image based on product type
  const getDefaultImage = (item) => {
    const metalName = item.MetalName?.toLowerCase() || '';
    const categoryName = item.CategoryName?.toLowerCase() || '';
    const productName = item.ProductName?.toLowerCase() || '';
    
    // Check for silver
    if (metalName.includes('silver') || categoryName.includes('silver') || productName.includes('silver')) {
      return 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop&crop=center';
    }
    
    // Check for platinum
    if (metalName.includes('platinum') || categoryName.includes('platinum') || productName.includes('platinum')) {
      return 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop&crop=center';
    }
    
    // Check for diamond
    if (categoryName.includes('diamond') || productName.includes('diamond')) {
      return 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop&crop=center';
    }
    
    // Check for ring
    if (categoryName.includes('ring') || productName.includes('ring')) {
      return 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop&crop=center';
    }
    
    // Check for necklace/chain
    if (categoryName.includes('necklace') || categoryName.includes('chain') || productName.includes('necklace') || productName.includes('chain')) {
      return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&h=200&fit=crop&crop=center';
    }
    
    // Check for earrings
    if (categoryName.includes('earring') || productName.includes('earring')) {
      return 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&h=200&fit=crop&crop=center';
    }
    
    // Check for bracelet
    if (categoryName.includes('bracelet') || productName.includes('bracelet')) {
      return 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=200&h=200&fit=crop&crop=center';
    }
    
    // Default to gold jewelry
    return 'https://images.unsplash.com/photo-1611955167811-4711904bb9f8?w=200&h=200&fit=crop&crop=center';
  };

  // Handle image error
  const handleImageError = (e, item) => {
    e.target.src = getDefaultImage(item);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'apiactive': return '#0077d4';
      case 'active': return '#10b981';
      case 'inactive': return '#ef4444';
      case 'sold': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusBg = (status) => {
    switch (status?.toLowerCase()) {
      case 'apiactive': return '#e3f2fd';
      case 'active': return '#d1fae5';
      case 'inactive': return '#fee2e2';
      case 'pending': return '#fef3c7';
      default: return '#f3f4f6';
    }
  };

  // Pagination helper
  const getPagination = (current, total) => {
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
  };

  // PDF Catalog Generation Function
  const generatePDFCatalog = async () => {
    setGeneratingPDF(true);
    
    try {
      const pdf = await CatalogPDF({ data: filteredStock, userName, clientCode });
      pdf.save(`${userName}_Professional_Catalog_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Success message
      setTimeout(() => {
        alert(`✅ PDF Catalog Generated Successfully!\n\nFile: ${userName}_Professional_Catalog_${new Date().toISOString().split('T')[0]}.pdf\nItems: ${Math.min(filteredStock.length, 50)} products\nClient: ${userName}\n\nThe catalog has been downloaded to your device.`);
      }, 500);
      
    } catch (error) {
      console.error('Error generating PDF catalog:', error);
      alert(`❌ Error generating PDF catalog: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Generate Printable HTML Catalog
  const generatePrintableCatalog = (data, userName, clientCode) => {
    const formatWeight = (weight) => weight ? `${parseFloat(weight).toFixed(2)}g` : 'N/A';
    
    const getImageUrl = (item) => {
      if (item.Images && item.Images.trim() !== '') {
        return item.Images;
      }
      return getDefaultImage(item);
    };

    const itemsHTML = data.map((item, index) => `
      <div class="catalog-item">
        <div class="item-header">
          <img src="${getImageUrl(item)}" alt="${item.ProductName || 'Product'}" class="product-image" 
               onerror="this.src='${getDefaultImage(item)}'">
          <div class="item-info">
            <h3>${item.ProductName || 'Product'}</h3>
            <p class="item-code">Code: ${item.ItemCode || 'N/A'}</p>
            <span class="category-badge">${item.CategoryName || 'N/A'}</span>
            <span class="status-badge status-${(item.Status || '').toLowerCase()}">${item.Status || 'N/A'}</span>
          </div>
        </div>
        <div class="item-details">
          <div class="detail-row">
            <span>Design:</span>
            <span>${item.DesignName || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span>Purity:</span>
            <span>${item.PurityName || 'N/A'}</span>
          </div>
        </div>
        <div class="weight-section">
          <h4>Weight Details</h4>
          <div class="weight-row">
            <span>Gross: ${formatWeight(item.GrossWt)}</span>
            <span>Net: ${formatWeight(item.NetWt)}</span>
          </div>
        </div>
        ${item.RFIDCode ? `<div class="rfid-section">RFID: ${item.RFIDCode}</div>` : ''}
        ${item.BoxName ? `<div class="location-section">Box: ${item.BoxName}</div>` : ''}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Jewelry Catalog - ${userName}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
          }
          
          .catalog-header {
            background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .catalog-header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5rem;
            font-weight: bold;
          }
          
          .catalog-header p {
            margin: 5px 0;
            font-size: 1.1rem;
            opacity: 0.9;
          }
          
          .catalog-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .catalog-item {
            background: white;
            border: 2px solid #f59e0b;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            break-inside: avoid;
          }
          
          .item-header {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .product-image {
            width: 200px;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #f59e0b;
          }
          
          .item-info {
            flex: 1;
          }
          
          .item-info h3 {
            margin: 0 0 8px 0;
            color: #1e40af;
            font-size: 1.2rem;
            font-weight: bold;
          }
          
          .item-code {
            margin: 0 0 10px 0;
            color: #6b7280;
            font-family: monospace;
            font-size: 0.9rem;
          }
          
          .category-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-right: 8px;
          }
          
          .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
          }
          
          .status-apiactive {
            background: #d1fae5;
            color: #059669;
          }
          
          .status-active {
            background: #d1fae5;
            color: #059669;
          }
          
          .status-inactive {
            background: #fee2e2;
            color: #dc2626;
          }
          
          .item-details {
            margin-bottom: 15px;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.9rem;
          }
          
          .detail-row span:first-child {
            color: #6b7280;
            font-weight: 600;
          }
          
          .detail-row span:last-child {
            color: #1f2937;
            font-weight: bold;
          }
          
          .weight-section {
            background: #fef3c7;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          
          .weight-section h4 {
            margin: 0 0 8px 0;
            color: #92400e;
            font-size: 0.9rem;
            font-weight: bold;
          }
          
          .weight-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            color: #92400e;
          }
          
          .rfid-section, .location-section {
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.8rem;
            color: #6b7280;
            margin-bottom: 5px;
            font-family: monospace;
          }
          
          .summary-section {
            background: white;
            border: 2px solid #f59e0b;
            border-radius: 12px;
            padding: 25px;
            margin-top: 30px;
          }
          
          .summary-section h2 {
            color: #1e40af;
            margin-bottom: 20px;
            font-size: 1.5rem;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          
          .stat-item {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
          }
          
          .stat-item strong {
            color: #1e40af;
            font-size: 1.1rem;
          }
          
          .print-button {
            background: #059669;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 20px;
          }
          
          @media print {
            .catalog-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            .catalog-item {
              break-inside: avoid;
              margin-bottom: 20px;
            }
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Print This Catalog</button>
        
        <div class="catalog-header">
          <h1>Sparkle RFID Jewellery Catalog</h1>
          <p>Client: ${userName} (${clientCode})</p>
          <p>Generated: ${new Date().toLocaleDateString()} | Total Items: ${data.length}</p>
          <p>Professional Inventory Report with Product Images</p>
        </div>
        
        <div class="catalog-grid">
          ${itemsHTML}
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 0.9rem;">
          Generated by RFID Jewelry Management System | © ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;
  };

  // Helper: get all unique statuses for dropdown
  const allStatuses = Array.from(new Set(stockData.map(item => item.Status).filter(Boolean)));
  const statusOptions = allStatuses.length ? allStatuses : ['Active', 'Sold', 'ApiActive'];

  // Helper: update status API
  const updateItemStatus = async (item, newStatus) => {
    setStatusUpdating(prev => ({ ...prev, [item.Id]: true }));
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://rrgold.loyalstring.co.in/api/Admin/change-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientCode: clientCode,
          Status: newStatus,
          ItemCodes: [item.ItemCode],
          RFIDCodes: [item.RFIDCode]
        })
      });
      if (!response.ok) throw new Error('Failed to update status');
      setStockData(prev => prev.map(row => row.Id === item.Id ? { ...row, Status: newStatus } : row));
      window.toast && window.toast.success && window.toast.success('Status updated successfully!');
    } catch (err) {
      window.toast && window.toast.error && window.toast.error('Failed to update status');
    } finally {
      setStatusUpdating(prev => ({ ...prev, [item.Id]: false }));
      setOpenStatusDropdown(null);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (openStatusDropdown !== null) {
        const ref = statusDropdownRefs.current[openStatusDropdown];
        if (ref && !ref.contains(event.target)) {
          setOpenStatusDropdown(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openStatusDropdown]);

  // Keyboard navigation for dropdown
  const handleDropdownKeyDown = (e, item, currentStatusIdx) => {
    if (!openStatusDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (currentStatusIdx + 1) % statusOptions.length;
      const nextOption = document.getElementById(`status-option-${item.Id}-${nextIdx}`);
      nextOption && nextOption.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (currentStatusIdx - 1 + statusOptions.length) % statusOptions.length;
      const prevOption = document.getElementById(`status-option-${item.Id}-${prevIdx}`);
      prevOption && prevOption.focus();
    } else if (e.key === 'Escape') {
      setOpenStatusDropdown(null);
    }
  };

  // Helper: get color for status
  const getStatusStyle = (status) => {
    if (status === 'Active') return { bg: '#ecfdf5', color: '#059669', dot: '#34d399' };
    if (status === 'ApiActive') return { bg: '#eff6ff', color: '#2563eb', dot: '#60a5fa' };
    if (status === 'Sold') return { bg: '#fef2f2', color: '#dc2626', dot: '#fca5a5' };
    return { bg: '#f3f4f6', color: '#6b7280', dot: '#d1d5db' };
  };

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
          onClick={onBack} 
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
          Back to User Details
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
            <i className="fas fa-boxes" style={{ fontSize: '20px', color: '#ffffff' }}></i>
          </div>
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#101828',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              Stock Inventory
            </div>
            <div style={{
              fontSize: '14px',
              color: '#667085',
              fontWeight: 400,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              {userName} ({clientCode})
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
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
            placeholder="Search by product, item code, category, RFID, design..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? '#0077d4' : 'transparent',
              color: showFilters ? '#ffffff' : '#667085',
              border: '1px solid #e4e7ec',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              position: 'relative',
              outline: 'none',
              height: '40px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onMouseEnter={e => {
              if (!showFilters) {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
            onMouseLeave={e => {
              if (!showFilters) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#e4e7ec';
              }
            }}
          >
            <i className="fas fa-filter" style={{ fontSize: 12 }}></i>
            Filters
            {hasActiveFilters && (
              <div style={{
                position: 'absolute',
                top: -5,
                right: -5,
                width: 12,
                height: 12,
                background: '#dc2626',
                borderRadius: '50%',
                border: '2px solid #ffffff'
              }} />
            )}
          </button>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#0077d4' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : '#667085',
                border: '1px solid #e4e7ec',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                outline: 'none',
                height: '40px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
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
              <i className="fas fa-table" style={{ fontSize: 12 }}></i>
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#6b7280' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : '#667085',
                border: '1px solid #e4e7ec',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                outline: 'none',
                height: '40px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
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
              <i className="fas fa-th-large" style={{ fontSize: 12 }}></i>
              Grid
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={!pageData.length}
            style={{
              background: pageData.length ? '#10b981' : 'transparent',
              color: pageData.length ? '#ffffff' : '#9ca3af',
              border: '1px solid #e4e7ec',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: 14,
              cursor: pageData.length ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              outline: 'none',
              height: '40px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onMouseEnter={e => {
              if (pageData.length) {
                e.currentTarget.style.background = '#059669';
              }
            }}
            onMouseLeave={e => {
              if (pageData.length) {
                e.currentTarget.style.background = '#10b981';
              }
            }}
          >
            <i className="fas fa-download" style={{ fontSize: 12 }}></i>
            Export Excel
          </button>

          {/* Print Catalog Button */}
          <button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              const catalogHTML = generatePrintableCatalog(filteredStock.slice(0, 30), userName, clientCode);
              printWindow.document.write(catalogHTML);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                printWindow.print();
              }, 1000);
            }}
            disabled={!filteredStock.length}
            style={{
              background: filteredStock.length ? '#dc2626' : 'transparent',
              color: filteredStock.length ? '#ffffff' : '#9ca3af',
              border: '1px solid #e4e7ec',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: 14,
              cursor: filteredStock.length ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              outline: 'none',
              height: '40px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onMouseEnter={e => {
              if (filteredStock.length) {
                e.currentTarget.style.background = '#b91c1c';
              }
            }}
            onMouseLeave={e => {
              if (filteredStock.length) {
                e.currentTarget.style.background = '#dc2626';
              }
            }}
          >
            <i className="fas fa-file-pdf" style={{ fontSize: 12 }}></i>
            PDF Catalog
          </button>

          {/* Send Email Button */}
          <button
            onClick={() => setShowEmailModal(true)}
            style={{
              background: '#0077d4',
              color: '#ffffff',
              border: '1px solid #0077d4',
              borderRadius: 8,
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              outline: 'none',
              height: '40px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#0056b3';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 119, 212, 0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#0077d4';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <i className="fas fa-envelope" style={{ fontSize: 12 }}></i>
            Send Email
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid rgba(0, 119, 212, 0.2)',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#38414a',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <i className="fas fa-sliders-h" style={{ fontSize: '1rem', color: '#0077d4' }}></i>
              Filter Options
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onMouseEnter={e => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={e => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <i className="fas fa-times" style={{ fontSize: 11 }}></i>
                Clear All
              </button>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {/* Category Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Category
              </label>
              <select
                value={filters.category}
                onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '2px solid rgba(0, 119, 212, 0.2)',
                  fontSize: 14,
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0077d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0, 119, 212, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Product Name Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Product Name
              </label>
              <select
                value={filters.productName}
                onChange={e => setFilters(prev => ({ ...prev, productName: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '2px solid rgba(0, 119, 212, 0.2)',
                  fontSize: 14,
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0077d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0, 119, 212, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Product Names</option>
                {productNames.map(productName => (
                  <option key={productName} value={productName}>{productName}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '2px solid rgba(0, 119, 212, 0.2)',
                  fontSize: 14,
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0077d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0, 119, 212, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Purity Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Purity
              </label>
              <select
                value={filters.purity}
                onChange={e => setFilters(prev => ({ ...prev, purity: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '2px solid rgba(0, 119, 212, 0.2)',
                  fontSize: 14,
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0077d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0, 119, 212, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Purities</option>
                {purities.map(purity => (
                  <option key={purity} value={purity}>{purity}</option>
                ))}
              </select>
            </div>

            {/* Design Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Design
              </label>
              <select
                value={filters.design}
                onChange={e => setFilters(prev => ({ ...prev, design: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '2px solid rgba(0, 119, 212, 0.2)',
                  fontSize: 14,
                  background: '#ffffff',
                  color: '#1e293b',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#0077d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(0, 119, 212, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Designs</option>
                {designs.map(design => (
                  <option key={design} value={design}>{design}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(0, 119, 212, 0.2)'
            }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '0.75rem'
              }}>
                Active Filters:
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                {search && (
                  <span style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    Search: "{search}"
                    <button
                      onClick={() => setSearch('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4
                      }}
                    >
                      <i className="fas fa-times" style={{ fontSize: 10 }}></i>
                    </button>
                  </span>
                )}
                {filters.category && (
                  <span style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    Category: {filters.category}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4
                      }}
                    >
                      <i className="fas fa-times" style={{ fontSize: 10 }}></i>
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    Status: {filters.status}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4
                      }}
                    >
                      <i className="fas fa-times" style={{ fontSize: 10 }}></i>
                    </button>
                  </span>
                )}
                {filters.purity && (
                  <span style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    Purity: {filters.purity}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, purity: '' }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4
                      }}
                    >
                      <i className="fas fa-times" style={{ fontSize: 10 }}></i>
                    </button>
                  </span>
                )}
                {filters.design && (
                  <span style={{
                    background: 'linear-gradient(135deg, #f43f5e 0%, #fda4af 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    Design: {filters.design}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, design: '' }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4
                      }}
                    >
                      <i className="fas fa-times" style={{ fontSize: 10 }}></i>
                    </button>
                  </span>
                )}
                {filters.productName && (
                  <span style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    Product Name: {filters.productName}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, productName: '' }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: 0,
                        marginLeft: 4
                      }}
                    >
                      <i className="fas fa-times" style={{ fontSize: 10 }}></i>
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Catalog Preview Section */}
      {/*filteredStock.length > 0 && (
        <div className="catalog-preview" style={{
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px dashed #f59e0b;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          color: #92400e;
          font-weight: 600;
        }}>
          <div style={{ 
            fontSize: '2.5rem', 
            color: '#dc2626', 
            marginBottom: '10px',
            fontWeight: 'bold'
          }}>
            PDF
          </div>
          <div style={{ 
            fontSize: '1.2rem', 
            fontWeight: 700, 
            color: '#92400e',
            marginBottom: '8px'
          }}>
            Professional Jewelry Catalog Ready
          </div>
          <div style={{ 
            fontSize: '0.9rem', 
            color: '#92400e',
            marginBottom: '12px'
          }}>
            Generate a professional catalog with {Math.min(filteredStock.length, 50)} products in optimized layout
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            fontSize: '0.8rem',
            color: '#78716c'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
              Category Icons
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
              Product Details
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
              Clean Layout
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
              Summary Report
            </div>
          </div>
        </div>
      )*/}

      {/* Loading State */}
      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          color: '#0077d4', 
          fontSize: '1rem', 
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #e3f2fd',
            borderTop: '3px solid #0077d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Loading stock data...
        </div>
      ) : error ? (
        <div style={{ 
          color: '#dc2626', 
          textAlign: 'center', 
          fontWeight: 600,
          padding: '2rem',
          background: '#ffebee',
          borderRadius: 16,
          border: '1px solid rgba(220, 38, 38, 0.2)'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8, fontSize: '1.1rem' }}></i>
          {error}
        </div>
      ) : filteredStock.length === 0 ? (
        <div style={{ 
          color: '#666', 
          textAlign: 'center', 
          fontWeight: 600, 
          fontSize: '1.1rem', 
          padding: '3rem',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
        }}>
          <i className="fas fa-boxes" style={{ fontSize: '3rem', color: '#ddd', marginBottom: '1rem', display: 'block' }}></i>
          No stock data found.
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
                <i className="fas fa-table" style={{ fontSize: '18px', color: '#ffffff' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>
                  Stock Inventory
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                  Total: {filteredStock.length} products • Page {page} of {totalPages} • {viewMode === 'table' ? 'Table View' : 'Grid View'}
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
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, filteredStock.length)}
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid #e4e7ec',
              marginBottom: '24px'
            }}>
              <div style={{ overflowX: 'auto' }}>
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
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#101828', minWidth: '120px' }}>Item Code</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#101828', minWidth: '150px' }}>Product Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#101828', minWidth: '120px' }}>Category</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#101828', minWidth: '120px' }}>Design</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#101828', minWidth: '80px' }}>Purity</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#101828', minWidth: '100px' }}>Gross Wt</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#101828', minWidth: '100px' }}>Net Wt</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#101828', minWidth: '100px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#101828', minWidth: '120px' }}>RFID Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((item, index) => (
                      <tr key={item.Id || index} style={{ 
                        borderBottom: '1px solid #e4e7ec',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', color: '#475467', fontWeight: 500, fontFamily: 'Inter, monospace' }}>
                          {item.ItemCode || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#101828', fontWeight: 500 }}>
                          {item.ProductName || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475467', fontWeight: 400 }}>
                          {item.CategoryName || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475467', fontWeight: 400 }}>
                          {item.DesignName || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#101828', fontWeight: 500 }}>
                          {item.PurityName || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#101828', textAlign: 'right', fontWeight: 500 }}>
                          {formatWeight(item.GrossWt)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#101828', textAlign: 'right', fontWeight: 500 }}>
                          {formatWeight(item.NetWt)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div
                            ref={el => statusDropdownRefs.current[item.Id] = el}
                            style={{ position: 'relative', display: 'inline-block', minWidth: 110 }}
                          >
                            <button
                              type="button"
                              aria-haspopup="listbox"
                              aria-expanded={openStatusDropdown === item.Id}
                              aria-label="Change status"
                              disabled={!!statusUpdating[item.Id]}
                              tabIndex={0}
                              onClick={() => setOpenStatusDropdown(openStatusDropdown === item.Id ? null : item.Id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setOpenStatusDropdown(openStatusDropdown === item.Id ? null : item.Id);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '5px 20px 5px 14px',
                                borderRadius: 18,
                                fontSize: '13px',
                                fontWeight: 500,
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                                background: getStatusStyle(item.Status).bg,
                                color: getStatusStyle(item.Status).color,
                                border: openStatusDropdown === item.Id ? '1.5px solid #0077d4' : '1.2px solid #e5e7eb',
                                minWidth: 90,
                                outline: openStatusDropdown === item.Id ? '2px solid #0077d420' : 'none',
                                cursor: statusUpdating[item.Id] ? 'not-allowed' : 'pointer',
                                opacity: statusUpdating[item.Id] ? 0.7 : 1,
                                boxShadow: openStatusDropdown === item.Id ? '0 4px 16px #0077d420' : '0 1px 4px rgba(44, 62, 80, 0.06)',
                                transition: 'box-shadow 0.2s, border 0.2s, background 0.2s',
                                margin: 0,
                                position: 'relative',
                                zIndex: 2
                              }}
                            >
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: getStatusStyle(item.Status).dot,
                                display: 'inline-block',
                              }} />
                              <span>{item.Status || 'N/A'}</span>
                              <span style={{ fontSize: 13, marginLeft: 2, color: getStatusStyle(item.Status).color, display: 'flex', alignItems: 'center' }}>▼</span>
                              {statusUpdating[item.Id] && (
                                <span style={{
                                  marginLeft: 8,
                                  fontSize: 10,
                                  color: '#0077d4',
                                  background: '#f0f9ff',
                                  borderRadius: 7,
                                  padding: '1.5px 8px',
                                  fontWeight: 500,
                                  boxShadow: '0 1px 4px #0077d420',
                                }}>Updating...</span>
                              )}
                            </button>
                            {openStatusDropdown === item.Id && (
                              <ul
                                role="listbox"
                                tabIndex={-1}
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: '110%',
                                  minWidth: 120,
                                  background: '#fff',
                                  border: '1.5px solid #e5e7eb',
                                  borderRadius: 12,
                                  boxShadow: '0 8px 32px rgba(44, 62, 80, 0.13)',
                                  margin: 0,
                                  padding: '6px 0',
                                  zIndex: 100,
                                  listStyle: 'none',
                                  outline: 'none',
                                  animation: 'fadeIn 0.18s',
                                }}
                              >
                                {statusOptions.map((status, idx) => (
                                  <li
                                    key={status}
                                    id={`status-option-${item.Id}-${idx}`}
                                    role="option"
                                    aria-selected={item.Status === status}
                                    tabIndex={0}
                                    onClick={() => !statusUpdating[item.Id] && updateItemStatus(item, status)}
                                    onKeyDown={e => handleDropdownKeyDown(e, item, idx)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '7px 18px',
                                      fontSize: '13px',
                                      fontWeight: 500,
                                      color: getStatusStyle(status).color,
                                      background: item.Status === status ? getStatusStyle(status).bg : '#fff',
                                      border: 'none',
                                      cursor: statusUpdating[item.Id] ? 'not-allowed' : 'pointer',
                                      outline: 'none',
                                      transition: 'background 0.15s',
                                      borderRadius: 8,
                                      margin: '2px 6px',
                                      boxShadow: item.Status === status ? '0 1px 4px #0077d420' : 'none',
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = getStatusStyle(status).bg}
                                    onMouseOut={e => e.currentTarget.style.background = item.Status === status ? getStatusStyle(status).bg : '#fff'}
                                  >
                                    <span style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      background: getStatusStyle(status).dot,
                                      display: 'inline-block',
                                    }} />
                                    <span>{status}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475467', fontFamily: 'Inter, monospace', fontSize: '13px' }}>
                          {item.RFIDCode || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '12px',
              marginBottom: '2rem'
            }}>
              {pageData.map((item, index) => (
                <div key={item.Id || index} style={{
                  background: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #e4e7ec',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  height: '160px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
                >
                  {/* Blue top accent line */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: '#0077d4'
                  }} />

                  {/* Card Content - Horizontal Layout */}
                  <div style={{
                    display: 'flex',
                    height: '100%',
                    paddingTop: '3px'
                  }}>
                    {/* Product Image - Left Side */}
                    <div style={{
                      width: '120px',
                      height: '157px',
                      background: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {item.Images && item.Images.trim() !== '' ? (
                        <img 
                          src={item.Images} 
                          alt={item.ProductName || 'Product'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={e => {
                            e.target.src = getDefaultImage(item);
                          }}
                        />
                      ) : (
                        <img 
                          src={getDefaultImage(item)} 
                          alt={item.ProductName || 'Product'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                    </div>

                    {/* Product Details - Right Side */}
                    <div style={{ 
                      flex: 1, 
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      {/* Header Section */}
                      <div>
                        {/* Product Title with Diamond Icon */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '4px'
                        }}>
                          <div style={{
                            width: 14,
                            height: 14,
                            background: '#0077d4',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className="fas fa-gem" style={{ 
                              fontSize: '6px', 
                              color: '#ffffff' 
                            }}></i>
                          </div>
                          <h3 style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#374151',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textTransform: 'uppercase',
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }}>
                            {item.ProductName || 'GOLD PRODUCT'}
                          </h3>
                        </div>

                        {/* Active Status Badge */}
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{
                            background: item.Status === 'Active' ? '#d1fae5' : getStatusBg(item.Status),
                            color: item.Status === 'Active' ? '#065f46' : getStatusColor(item.Status),
                            padding: '2px 6px',
                            borderRadius: 8,
                            fontSize: '9px',
                            fontWeight: 500,
                            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }}>
                            {item.Status || 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Content Sections */}
                      <div>
                        {/* Item Code / Category Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '6px',
                          marginBottom: '4px'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '8px',
                              color: '#6b7280',
                              fontWeight: 500,
                              marginBottom: '1px',
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              Item Code
                            </div>
                            <div style={{
                              fontSize: '10px',
                              color: '#111827',
                              fontWeight: 600,
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              {item.ItemCode || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: '8px',
                              color: '#6b7280',
                              fontWeight: 500,
                              marginBottom: '1px',
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              Category
                            </div>
                            <div style={{
                              fontSize: '10px',
                              color: '#111827',
                              fontWeight: 600,
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              {item.CategoryName || 'GOLD'}
                            </div>
                          </div>
                        </div>

                        {/* Design / Purity Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '6px',
                          marginBottom: '4px'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '8px',
                              color: '#6b7280',
                              fontWeight: 500,
                              marginBottom: '1px',
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              Design
                            </div>
                            <div style={{
                              fontSize: '10px',
                              color: '#111827',
                              fontWeight: 600,
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              {item.DesignName || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: '8px',
                              color: '#6b7280',
                              fontWeight: 500,
                              marginBottom: '1px',
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              Purity
                            </div>
                            <div style={{
                              fontSize: '10px',
                              color: '#111827',
                              fontWeight: 600,
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              {item.PurityName || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Weight Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '8px',
                          marginTop: '6px'
                        }}>
                          <div>
                            <div style={{
                              fontSize: '9px',
                              color: '#6b7280',
                              fontWeight: 500,
                              marginBottom: '2px',
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              Gross Weight
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#eab308',
                              fontWeight: 700,
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              {formatWeight(item.GrossWt)}
                            </div>
                          </div>
                          <div>
                            <div style={{
                              fontSize: '9px',
                              color: '#6b7280',
                              fontWeight: 500,
                              marginBottom: '2px',
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              Net Weight
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#eab308',
                              fontWeight: 700,
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                            }}>
                              {formatWeight(item.NetWt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 119, 212, 0.1)'
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  background: page === 1 ? '#f5f5f5' : '#0077d4',
                  color: page === 1 ? '#ccc' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  width: 40,
                  height: 40,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              {getPagination(page, totalPages).map((p, i) =>
                p === '...'
                  ? <span key={i} style={{ 
                      padding: '0 8px', 
                      color: '#999', 
                      fontWeight: 600, 
                      fontSize: 14 
                    }}>...</span>
                  : <button
                    key={i}
                    onClick={() => setPage(p)}
                    style={{
                      background: page === p ? '#0077d4' : '#ffffff',
                      color: page === p ? '#fff' : '#0077d4',
                      border: page === p ? 'none' : '2px solid #e3f2fd',
                      borderRadius: 10,
                      width: 40,
                      height: 40,
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: page === p ? '0 2px 8px rgba(0, 119, 212, 0.3)' : 'none'
                    }}
                    onMouseEnter={e => {
                      if (page !== p) {
                        e.target.style.background = '#f8fbff';
                        e.target.style.borderColor = '#0077d4';
                      }
                    }}
                    onMouseLeave={e => {
                      if (page !== p) {
                        e.target.style.background = '#ffffff';
                        e.target.style.borderColor = '#e3f2fd';
                      }
                    }}
                  >{p}</button>
              )}
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  background: page === totalPages ? '#f5f5f5' : '#0077d4',
                  color: page === totalPages ? '#ccc' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  width: 40,
                  height: 40,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
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
                    Send email to {userName}
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
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={e => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#0077d4';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Message Field */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Message *
                </label>
                <textarea
                  value={emailData.message}
                  onChange={e => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message here..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    resize: 'vertical',
                    minHeight: '120px'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#0077d4';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 119, 212, 0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailData({ subject: '', message: '' });
                  }}
                  style={{
                    padding: '12px 24px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailData.subject.trim() || !emailData.message.trim()}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: 8,
                    background: (sendingEmail || !emailData.subject.trim() || !emailData.message.trim()) 
                      ? '#d1d5db' : '#0077d4',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: (sendingEmail || !emailData.subject.trim() || !emailData.message.trim()) 
                      ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                  }}
                  onMouseEnter={e => {
                    if (!sendingEmail && emailData.subject.trim() && emailData.message.trim()) {
                      e.currentTarget.style.background = '#0056b3';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 119, 212, 0.3)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!sendingEmail && emailData.subject.trim() && emailData.message.trim()) {
                      e.currentTarget.style.background = '#0077d4';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {sendingEmail ? (
                    <>
                      <div style={{
                        width: 16,
                        height: 16,
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane" style={{ fontSize: '12px' }}></i>
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @media (max-width: 900px) {
          .d-lg-flex { display: none !important; }
          .d-lg-none { display: block !important; }
        }
        @media (min-width: 901px) {
          .d-lg-flex { display: flex !important; }
          .d-lg-none { display: none !important; }
        }
        @media (max-width: 600px) {
          header {
            padding: 0.7rem 0.5rem !important;
          }
          .profile-btn {
            min-width: 120px !important;
            font-size: 0.98rem !important;
            padding: 8px 10px 8px 10px !important;
          }
          .header-logo {
            height: 32px !important;
            margin-right: 10px !important;
            max-width: 100px !important;
          }
          .d-flex.align-items-center {
            width: 100%;
            justify-content: space-between;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        
        .pdf-catalog-btn {
          position: relative;
          overflow: hidden;
        }
        
        .pdf-catalog-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        
        .pdf-catalog-btn:hover::before {
          left: 100%;
        }
        
        .catalog-preview {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px dashed #f59e0b;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
          color: #92400e;
          font-weight: 600;
        }
        
        .catalog-preview i {
          font-size: 2rem;
          margin-bottom: 10px;
          display: block;
          color: #f59e0b;
        }
      `}</style>
    </div>
  );
};

export default AdminViewUserStock; 