import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaArrowLeft, FaUserPlus, FaUsers, FaUserTie, FaUserFriends, FaChevronDown, FaChevronUp, FaBoxOpen, FaCubes, FaGem, FaTags, FaList, FaShapes, FaLayerGroup, FaThLarge, FaClipboardList, FaBarcode, FaRupeeSign, FaFolderOpen, FaExchangeAlt, FaFileInvoice, FaCartPlus, FaUserCheck, FaUserTimes, FaFileAlt, FaClipboardCheck, FaClipboard, FaTools, FaCheckSquare, FaRegMoneyBillAlt, FaRegListAlt, FaRegChartBar, FaRegCalendarCheck, FaChartBar, FaBook, FaCoins, FaCashRegister, FaShoppingCart, FaListAlt, FaUserCircle, FaUserFriends as FaUserFriendsAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const ZOHO_FONT = 'Inter, Segoe UI, Arial, sans-serif';
const PAGE_FONT_WEIGHT = 400;
const TITLE_FONT_WEIGHT = 500;

const sidebarMenus = [
  {
    key: 'create-member',
    label: 'Create Member',
    icon: <FaUserPlus style={{ fontSize: 18, marginRight: 10, color: '#0077d4' }} />,
    submenu: [
      { key: 'customer', label: 'Customer', icon: <FaUserFriends style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
      { key: 'vendor', label: 'Vendor', icon: <FaUserTie style={{ fontSize: 15, marginRight: 10, color: '#f9ab00' }} /> },
      { key: 'employees', label: 'Employees', icon: <FaUsers style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
    ],
  },
  {
    key: 'create-product',
    label: 'Create Product',
    icon: <FaBoxOpen style={{ fontSize: 18, marginRight: 10, color: '#34a853' }} />,
    submenu: [
      { key: 'category', label: 'Category', icon: <FaList style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
      { key: 'product', label: 'Product', icon: <FaCubes style={{ fontSize: 15, marginRight: 10, color: '#f44292' }} /> },
      { key: 'design', label: 'Design', icon: <FaShapes style={{ fontSize: 15, marginRight: 10, color: '#f9ab00' }} /> },
      { key: 'purity', label: 'Purity', icon: <FaLayerGroup style={{ fontSize: 15, marginRight: 10, color: '#a142f4' }} /> },
      { key: 'packet', label: 'Packet', icon: <FaThLarge style={{ fontSize: 15, marginRight: 10, color: '#24c1e0' }} /> },
      { key: 'box', label: 'Box', icon: <FaBoxOpen style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
      { key: 'stone', label: 'Stone', icon: <FaGem style={{ fontSize: 15, marginRight: 10, color: '#00bfae' }} /> },
      { key: 'diamond', label: 'Diamond', icon: <FaGem style={{ fontSize: 15, marginRight: 10, color: '#f44292' }} /> },
      { key: 'template', label: 'Template', icon: <FaClipboardList style={{ fontSize: 15, marginRight: 10, color: '#f9ab00' }} /> },
      { key: 'sku', label: 'SKU', icon: <FaBarcode style={{ fontSize: 15, marginRight: 10, color: '#a142f4' }} /> },
      { key: 'rates', label: 'Rates', icon: <FaRupeeSign style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
      { key: 'collection', label: 'Collection', icon: <FaFolderOpen style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
    ],
  },
  {
    key: 'transactions',
    label: 'Transactions',
    icon: <FaExchangeAlt style={{ fontSize: 18, marginRight: 10, color: '#f9ab00' }} />,
    submenu: [
      { key: 'purchase-entry', label: 'Purchase Entry', icon: <FaCartPlus style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
      { key: 'add-stock', label: 'Add Stock', icon: <FaBoxOpen style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
      { key: 'invoice', label: 'Invoice', icon: <FaFileInvoice style={{ fontSize: 15, marginRight: 10, color: '#f44292' }} /> },
      { key: 'stock-transfer', label: 'Stock Transfer', icon: <FaExchangeAlt style={{ fontSize: 15, marginRight: 10, color: '#f9ab00' }} /> },
      { key: 'customer-transaction', label: 'Customer Transaction', icon: <FaUserCheck style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
      { key: 'vendor-transaction', label: 'Vendor Transaction', icon: <FaUserTimes style={{ fontSize: 15, marginRight: 10, color: '#e94235' }} /> },
      { key: 'quotation', label: 'Quotation', icon: <FaFileAlt style={{ fontSize: 15, marginRight: 10, color: '#a142f4' }} /> },
      { key: 'custom-order', label: 'Custom Order', icon: <FaClipboardCheck style={{ fontSize: 15, marginRight: 10, color: '#24c1e0' }} /> },
      { key: 'credit-note', label: 'Credit Note', icon: <FaClipboard style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
      { key: 'debit-note', label: 'Debit Note', icon: <FaClipboard style={{ fontSize: 15, marginRight: 10, color: '#e94235' }} /> },
      { key: 'repair', label: 'Repair', icon: <FaTools style={{ fontSize: 15, marginRight: 10, color: '#f9ab00' }} /> },
      { key: 'stock-verification', label: 'Stock Verification', icon: <FaCheckSquare style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
    ],
  },
  {
    key: 'gold-scheme',
    label: 'Gold Scheme',
    icon: <FaRegMoneyBillAlt style={{ fontSize: 18, marginRight: 10, color: '#e94235' }} />,
    submenu: [
      { key: 'create-scheme', label: 'Create Scheme', icon: <FaRegListAlt style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
      { key: 'enrollment', label: 'Enrollment', icon: <FaUserPlus style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
      { key: 'scheme-installment', label: 'Scheme Installment', icon: <FaRegChartBar style={{ fontSize: 15, marginRight: 10, color: '#f9ab00' }} /> },
      { key: 'collection-report', label: 'Collection Report', icon: <FaRegCalendarCheck style={{ fontSize: 15, marginRight: 10, color: '#a142f4' }} /> },
      { key: 'scheme-maturity', label: 'Scheme Maturity', icon: <FaRegMoneyBillAlt style={{ fontSize: 15, marginRight: 10, color: '#e94235' }} /> },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: <FaChartBar style={{ fontSize: 18, marginRight: 10, color: '#0077d4' }} />,
    submenu: [
      { key: 'stock', label: 'Stock', icon: <FaBoxOpen style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
      { key: 'sale', label: 'Sale', icon: <FaShoppingCart style={{ fontSize: 15, marginRight: 10, color: '#f44292' }} /> },
      { key: 'order-list', label: 'Order List', icon: <FaListAlt style={{ fontSize: 15, marginRight: 10, color: '#f9ab00' }} /> },
      { key: 'purchase', label: 'Purchase', icon: <FaCartPlus style={{ fontSize: 15, marginRight: 10, color: '#0077d4' }} /> },
      { key: 'customer-ledger', label: 'Customer Ledger', icon: <FaUserCircle style={{ fontSize: 15, marginRight: 10, color: '#a142f4' }} /> },
      { key: 'supplier-ledger', label: 'Supplier Ledger', icon: <FaUserFriendsAlt style={{ fontSize: 15, marginRight: 10, color: '#24c1e0' }} /> },
      { key: 'old-metal', label: 'Old Metal', icon: <FaCoins style={{ fontSize: 15, marginRight: 10, color: '#e94235' }} /> },
      { key: 'cash', label: 'Cash', icon: <FaCashRegister style={{ fontSize: 15, marginRight: 10, color: '#34a853' }} /> },
    ],
  },
  {
    key: 'old-stock-mapping',
    label: 'Old Stock Mapping',
    icon: <FaTags style={{ fontSize: 18, marginRight: 10, color: '#a142f4' }} />,
    submenu: null,
  },
];

const PAGE_SIZE = 15;

const SparkleUserDetails = ({ user, onBack, userDetailsData }) => {
  const [expandedMenu, setExpandedMenu] = useState('create-member');
  const [activeSubMenu, setActiveSubMenu] = useState('customer');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Vendor state
  const [vendorData, setVendorData] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState('');
  const vendorFetched = useRef(false);
  // Employee state
  const [employeeData, setEmployeeData] = useState(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const employeeFetched = useRef(false);
  // Category state
  const [categoryData, setCategoryData] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const categoryFetched = useRef(false);
  // Product state
  const [productData, setProductData] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const productFetched = useRef(false);
  // Design state
  const [designData, setDesignData] = useState(null);
  const [designLoading, setDesignLoading] = useState(false);
  const [designError, setDesignError] = useState('');
  const designFetched = useRef(false);
  // Purity state
  const [purityData, setPurityData] = useState(null);
  const [purityLoading, setPurityLoading] = useState(false);
  const [purityError, setPurityError] = useState('');
  const purityFetched = useRef(false);
  // Packet state
  const [packetData, setPacketData] = useState(null);
  const [packetLoading, setPacketLoading] = useState(false);
  const [packetError, setPacketError] = useState('');
  const packetFetched = useRef(false);
  // Box state
  const [boxData, setBoxData] = useState(null);
  const [boxLoading, setBoxLoading] = useState(false);
  const [boxError, setBoxError] = useState('');
  const boxFetched = useRef(false);
  // Stone state
  const [stoneData, setStoneData] = useState(null);
  const [stoneLoading, setStoneLoading] = useState(false);
  const [stoneError, setStoneError] = useState('');
  const stoneFetched = useRef(false);
  // SKU state
  const [skuData, setSkuData] = useState(null);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuError, setSkuError] = useState('');
  const skuFetched = useRef(false);

  // Place this at the top-level of the component, before any renderPagination or table renderers
  const getPaginationPages = (page, totalPages) => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }
    const pages = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', page - 2, page - 1, page, page + 1, page + 2, '...', totalPages);
    }
    return pages;
  };

  // Fetch vendor data when Vendor submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-member' && activeSubMenu === 'vendor' && !vendorFetched.current) {
      setVendorLoading(true);
      setVendorError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPartyDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setVendorData(Array.isArray(data) ? data : []);
          vendorFetched.current = true;
        })
        .catch(() => setVendorError('Failed to fetch vendor data.'))
        .finally(() => setVendorLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch employee data when Employees submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-member' && activeSubMenu === 'employees' && !employeeFetched.current) {
      setEmployeeLoading(true);
      setEmployeeError('');
      fetch('https://rrgold.loyalstring.co.in/api/ClientOnboarding/GetAllEmployee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setEmployeeData(Array.isArray(data) ? data : []);
          employeeFetched.current = true;
        })
        .catch(() => setEmployeeError('Failed to fetch employee data.'))
        .finally(() => setEmployeeLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch category data when Create Product > Category submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'category' && !categoryFetched.current) {
      setCategoryLoading(true);
      setCategoryError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllCategory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setCategoryData(Array.isArray(data) ? data : []);
          categoryFetched.current = true;
        })
        .catch(() => setCategoryError('Failed to fetch category data.'))
        .finally(() => setCategoryLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch product data when Create Product > Product submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'product' && !productFetched.current) {
      setProductLoading(true);
      setProductError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllProductMaster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setProductData(Array.isArray(data) ? data : []);
          productFetched.current = true;
        })
        .catch(() => setProductError('Failed to fetch product data.'))
        .finally(() => setProductLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch design data when Create Product > Design submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'design' && !designFetched.current) {
      setDesignLoading(true);
      setDesignError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllDesign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setDesignData(Array.isArray(data) ? data : []);
          designFetched.current = true;
        })
        .catch(() => setDesignError('Failed to fetch design data.'))
        .finally(() => setDesignLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch purity data when Create Product > Purity submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'purity' && !purityFetched.current) {
      setPurityLoading(true);
      setPurityError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPurity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setPurityData(Array.isArray(data) ? data : []);
          purityFetched.current = true;
        })
        .catch(() => setPurityError('Failed to fetch purity data.'))
        .finally(() => setPurityLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch packet data when Create Product > Packet submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'packet' && !packetFetched.current) {
      setPacketLoading(true);
      setPacketError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllPacketMaster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setPacketData(Array.isArray(data) ? data : []);
          packetFetched.current = true;
        })
        .catch(() => setPacketError('Failed to fetch packet data.'))
        .finally(() => setPacketLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch box data when Create Product > Box submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'box' && !boxFetched.current) {
      setBoxLoading(true);
      setBoxError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllBoxMaster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setBoxData(Array.isArray(data) ? data : []);
          boxFetched.current = true;
        })
        .catch(() => setBoxError('Failed to fetch box data.'))
        .finally(() => setBoxLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch stone data when Create Product > Stone submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'stone' && !stoneFetched.current) {
      setStoneLoading(true);
      setStoneError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllStoneMaster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setStoneData(Array.isArray(data) ? data : []);
          stoneFetched.current = true;
        })
        .catch(() => setStoneError('Failed to fetch stone data.'))
        .finally(() => setStoneLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Fetch SKU data when Create Product > SKU submenu is selected
  useEffect(() => {
    if (expandedMenu === 'create-product' && activeSubMenu === 'sku' && !skuFetched.current) {
      setSkuLoading(true);
      setSkuError('');
      fetch('https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllSKU', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ ClientCode: user.ClientCode }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.statusText))
        .then(data => {
          setSkuData(Array.isArray(data) ? data : []);
          skuFetched.current = true;
        })
        .catch(() => setSkuError('Failed to fetch SKU data.'))
        .finally(() => setSkuLoading(false));
    }
  }, [expandedMenu, activeSubMenu, user.ClientCode]);

  // Helper: Render customer table
  const renderCustomerTable = () => {
    const customers = userDetailsData && userDetailsData.customer;
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No customer data found.</div>;
    }
    // Get columns from first customer object
    const columns = customers[0] ? Object.keys(customers[0]) : [];
    // Pick common fields to show (Name, Email, Mobile, etc.)
    const preferred = ['Name', 'CustomerName', 'Email', 'Mobile', 'Phone', 'City', 'State', 'GST', 'PAN', 'Address'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    // If not found, show first 5 fields
    const finalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 5);

    // Search filter
    const filtered = customers.filter(row =>
      finalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        finalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      XLSX.writeFile(wb, `Customers_${user.ClientCode || ''}.xlsx`);
    };

    // Pagination UI
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );

    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Customers for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {finalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((cust, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {finalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{cust[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render vendor table
  const renderVendorTable = () => {
    if (vendorLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading vendors...</div>;
    if (vendorError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{vendorError}</div>;
    if (!vendorData || !Array.isArray(vendorData) || vendorData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No vendor data found.</div>;
    }
    // Get columns from first vendor object
    const columns = vendorData[0] ? Object.keys(vendorData[0]) : [];
    // Pick common fields to show
    const preferred = ['Name', 'VendorName', 'Email', 'Mobile', 'Phone', 'City', 'State', 'GST', 'PAN', 'Address'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const finalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 5);
    // Search filter
    const filtered = vendorData.filter(row =>
      finalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        finalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
      XLSX.writeFile(wb, `Vendors_${user.ClientCode || ''}.xlsx`);
    };
    // Pagination UI (reuse from customer)
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Vendors for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {finalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((vend, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {finalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{vend[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render employee table
  const renderEmployeeTable = () => {
    if (employeeLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading employees...</div>;
    if (employeeError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{employeeError}</div>;
    if (!employeeData || !Array.isArray(employeeData) || employeeData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No employee data found.</div>;
    }
    // Get columns from first employee object
    const columns = employeeData[0] ? Object.keys(employeeData[0]) : [];
    // Pick common fields to show
    const preferred = ['Name', 'EmployeeName', 'Email', 'Mobile', 'Phone', 'City', 'State', 'Department', 'Designation', 'Address'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const finalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 5);
    // Search filter
    const filtered = employeeData.filter(row =>
      finalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        finalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      XLSX.writeFile(wb, `Employees_${user.ClientCode || ''}.xlsx`);
    };
    // Pagination UI (reuse from customer)
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Employees for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {finalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((emp, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {finalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{emp[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render category table
  const renderCategoryTable = () => {
    if (categoryLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading categories...</div>;
    if (categoryError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{categoryError}</div>;
    if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No category data found.</div>;
    }
    // Get columns from first category object
    const columns = categoryData[0] ? Object.keys(categoryData[0]) : [];
    // Pick common fields to show
    const preferred = ['CategoryName', 'CategoryCode', 'Description', 'CreatedDate', 'Status'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const finalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 5);
    // Search filter
    const filtered = categoryData.filter(row =>
      finalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        finalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Categories');
      XLSX.writeFile(wb, `Categories_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for category
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Categories for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {finalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((cat, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {finalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{cat[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render product table
  const renderProductTable = () => {
    if (productLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading products...</div>;
    if (productError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{productError}</div>;
    if (!productData || !Array.isArray(productData) || productData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No product data found.</div>;
    }
    // Get columns from first product object
    const columns = productData[0] ? Object.keys(productData[0]) : [];
    // Pick common fields to show
    const preferred = ['ProductName', 'ProductCode', 'CategoryName', 'HSNCode', 'Description', 'Status', 'CreatedDate'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const finalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 6);
    // Search filter
    const filtered = productData.filter(row =>
      finalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        finalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, `Products_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for product
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Products for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {finalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((prod, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {finalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{prod[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render design table
  const renderDesignTable = () => {
    if (designLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading designs...</div>;
    if (designError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{designError}</div>;
    if (!designData || !Array.isArray(designData) || designData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No design data found.</div>;
    }
    // Get columns from first design object
    const columns = designData[0] ? Object.keys(designData[0]) : [];
    // Pick common fields to show
    const preferred = ['DesignName', 'DesignCode', 'CategoryName', 'Description', 'Status', 'CreatedDate'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const finalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 6);
    // Search filter
    const filtered = designData.filter(row =>
      finalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        finalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Designs');
      XLSX.writeFile(wb, `Designs_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for design
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Designs for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search designs..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {finalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((design, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {finalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{design[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render purity table
  const renderPurityTable = () => {
    if (purityLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading purity...</div>;
    if (purityError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{purityError}</div>;
    if (!purityData || !Array.isArray(purityData) || purityData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No purity data found.</div>;
    }
    // Get columns from first purity object
    const columns = purityData[0] ? Object.keys(purityData[0]) : [];
    // Pick common fields to show
    const preferred = ['CategoryName', 'PurityName', 'ShortName', 'Description', 'FinePercentage', "TodaysRate"];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const finalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 6);
    // Search filter
    const filtered = purityData.filter(row =>
      finalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        finalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Purity');
      XLSX.writeFile(wb, `Purity_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for purity
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Purity for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search purity..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {finalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((purity, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {finalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{purity[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render packet table
  const renderPacketTable = () => {
    if (packetLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading packets...</div>;
    if (packetError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{packetError}</div>;
    if (!packetData || !Array.isArray(packetData) || packetData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No packet data found.</div>;
    }
    // Get columns from first packet object
    const columns = packetData[0] ? Object.keys(packetData[0]) : [];
    // Pick common fields to show
    const preferred = ['CategoryName', 'ProductName', 'PacketName', 'Box', 'SKU', 'EmptyWeight', 'Description', 'Status'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const packetFinalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 8);
    // Search filter
    const filtered = packetData.filter(row =>
      packetFinalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        packetFinalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Packets');
      XLSX.writeFile(wb, `Packets_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for packet
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Packets for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search packets..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {packetFinalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((packet, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {packetFinalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{packet[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render box table
  const renderBoxTable = () => {
    if (boxLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading boxes...</div>;
    if (boxError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{boxError}</div>;
    if (!boxData || !Array.isArray(boxData) || boxData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No box data found.</div>;
    }
    // Get columns from first box object
    const columns = boxData[0] ? Object.keys(boxData[0]) : [];
    // Pick common fields to show
    const preferred = ['CategoryName', 'ProductName', 'BoxName', 'Packets', 'EmptyWeight', 'Description', 'Status'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const boxFinalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 7);
    // Search filter
    const filtered = boxData.filter(row =>
      boxFinalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        boxFinalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Boxes');
      XLSX.writeFile(wb, `Boxes_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for box
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Boxes for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search boxes..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {boxFinalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((box, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {boxFinalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{box[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render stone table
  const renderStoneTable = () => {
    if (stoneLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading stones...</div>;
    if (stoneError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{stoneError}</div>;
    if (!stoneData || !Array.isArray(stoneData) || stoneData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No stone data found.</div>;
    }
    // Get columns from first stone object
    const columns = stoneData[0] ? Object.keys(stoneData[0]) : [];
    // Pick common fields to show
    const preferred = ['StoneName', 'StoneWeight', 'StonePieces', 'StoneRate', 'StoneAmount', 'Description'];
    const displayColumns = preferred.filter(col => columns.includes(col));
    const stoneFinalColumns = displayColumns.length > 0 ? displayColumns : columns.slice(0, 6);
    // Search filter
    const filtered = stoneData.filter(row =>
      stoneFinalColumns.some(col => (row[col] || '').toString().toLowerCase().includes(search.toLowerCase()))
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        stoneFinalColumns.forEach(col => { obj[col] = row[col]; });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stones');
      XLSX.writeFile(wb, `Stones_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for stone
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            Stones for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search stones..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {stoneFinalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((stone, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {stoneFinalColumns.map(col => (
                  <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{stone[col] || '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  // Helper: Render SKU table
  const renderSkuTable = () => {
    if (skuLoading) return <div style={{ color: '#1A73E8', fontSize: 18, fontWeight: 500, marginTop: 32 }}>Loading SKUs...</div>;
    if (skuError) return <div style={{ color: '#E94235', fontSize: 16, fontWeight: 500, marginTop: 32 }}>{skuError}</div>;
    if (!skuData || !Array.isArray(skuData) || skuData.length === 0) {
      return <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: 500, marginTop: 32 }}>No SKU data found.</div>;
    }
    // Get columns from first SKU object
    const columns = skuData[0] ? Object.keys(skuData[0]) : [];
    // Pick common fields to show
    const preferred = ['SKU', 'Design', 'Vendor', 'Category', 'Product', 'Purity', 'Description'];
    // Always show all preferred columns as headers, even if missing in data
    const skuFinalColumns = preferred;
    // Search filter
    const filtered = skuData.filter(row =>
      skuFinalColumns.some(col => {
        const val = row && row[col];
        if (Array.isArray(val)) return val.join(', ').toLowerCase().includes(search.toLowerCase());
        if (val && typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(search.toLowerCase());
        return (val || '').toString().toLowerCase().includes(search.toLowerCase());
      })
    );
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    // Export handler
    const handleExport = () => {
      if (!filtered.length) return;
      const exportData = filtered.map(row => {
        const obj = {};
        skuFinalColumns.forEach(col => {
          let val = row && row[col];
          if (Array.isArray(val)) val = val.join(', ');
          else if (val && typeof val === 'object') val = JSON.stringify(val);
          obj[col] = val !== undefined && val !== null && val !== '' ? val : '-';
        });
        return obj;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SKUs');
      XLSX.writeFile(wb, `SKUs_${user.ClientCode || ''}.xlsx`);
    };
    // Local pagination for SKU
    const renderPagination = () => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 24, paddingRight: 32, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              background: '#F3F4F6',
              color: '#A0AEC0',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&lt;</button>
          {getPaginationPages(page, totalPages).map((p, idx) =>
            p === '...'
              ? <span key={idx} style={{ padding: '5px 12px', color: '#A0AEC0', fontSize: 15, fontWeight: PAGE_FONT_WEIGHT }}>...</span>
              : <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    background: p === page ? '#1A73E8' : '#fff',
                    color: p === page ? '#fff' : '#1A73E8',
                    border: p === page ? '1.5px solid #1A73E8' : '1.5px solid #E3EAFD',
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontWeight: PAGE_FONT_WEIGHT,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: ZOHO_FONT,
                    boxShadow: p === page ? '0 2px 8px #1A73E820' : 'none',
                    transition: 'all 0.2s',
                  }}
                >{p}</button>
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            style={{
              background: '#1A73E8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '5px 12px',
              fontWeight: PAGE_FONT_WEIGHT,
              fontSize: 13,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.7 : 1,
              fontFamily: ZOHO_FONT,
              transition: 'all 0.2s',
            }}
          >&gt;</button>
        </div>
        <div style={{ textAlign: 'right', color: '#7b8a9b', fontSize: 13, fontWeight: PAGE_FONT_WEIGHT, margin: '12px 0 0 0', fontFamily: ZOHO_FONT }}>
          {filtered.length === 0
            ? 'No entries'
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
        </div>
      </div>
    );
    return (
      <div style={{ marginTop: 18, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #E3EAFD10', border: '1.5px solid #E3EAFD', padding: 0, overflow: 'auto', minWidth: '100%', maxWidth: '100%', fontWeight: PAGE_FONT_WEIGHT }}>
        {/* Table Title, Search, Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 32px 0 32px' }}>
          <div style={{ fontWeight: TITLE_FONT_WEIGHT, fontSize: 18, color: '#1A73E8', fontFamily: ZOHO_FONT }}>
            SKUs for Client Code: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.ClientCode}</span> &nbsp;|&nbsp; Username: <span style={{ color: '#222', fontWeight: TITLE_FONT_WEIGHT }}>{user.UserName || user.ClientName || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="text"
              placeholder="Search SKUs..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 260,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1.5px solid #E3EAFD',
                fontSize: 15,
                fontFamily: ZOHO_FONT,
                outline: 'none',
                background: '#F8FAFC',
                color: '#101828',
                fontWeight: PAGE_FONT_WEIGHT,
                boxShadow: '0 1px 3px #E3EAFD40',
              }}
            />
            <button
              onClick={handleExport}
              style={{
                background: '#34A853',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: PAGE_FONT_WEIGHT,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: ZOHO_FONT,
                boxShadow: '0 1px 3px #34A85330',
              }}
            >Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ZOHO_FONT, marginTop: 14, fontWeight: PAGE_FONT_WEIGHT }}>
          <thead>
            <tr style={{ background: '#F5F7FA', borderBottom: '2px solid #1A73E8' }}>
              {skuFinalColumns.map(col => (
                <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontWeight: TITLE_FONT_WEIGHT, color: '#222', fontSize: 16, letterSpacing: '0.5px', borderBottom: '1.5px solid #E3EAFD' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((sku, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F0F1F3' }}>
                {skuFinalColumns.map(col => {
                  let val = sku && sku[col];
                  if (Array.isArray(val)) val = val.join(', ');
                  else if (val && typeof val === 'object') val = JSON.stringify(val);
                  return <td key={col} style={{ padding: '15px 20px', fontSize: 15, color: '#38414a', fontWeight: PAGE_FONT_WEIGHT }}>{val !== undefined && val !== null && val !== '' ? val : '-'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {renderPagination()}
      </div>
    );
  };

  return (
    <div style={{ padding: 0, maxWidth: '100vw', minHeight: '80vh', margin: 0, fontFamily: ZOHO_FONT, background: '#F8FAFC', fontWeight: PAGE_FONT_WEIGHT }}>
      <div style={{
        background: '#fff',
        borderRadius: 0,
        boxShadow: '0 2px 12px rgba(26, 115, 232, 0.04)',
        border: 'none',
        width: '100%',
        minHeight: '80vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        <div style={{
          width: 260,
          background: '#fff',
          borderRight: '1.5px solid #E3EAFD',
          boxShadow: '2px 0 8px #E3EAFD10',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          minHeight: '80vh',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ padding: '36px 0 0 0' }}>
            {sidebarMenus.map(menu => (
              <div key={menu.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 600,
                    fontSize: 17,
                    color: expandedMenu === menu.key ? '#1A73E8' : '#222',
                    background: expandedMenu === menu.key ? '#F5F7FA' : 'transparent',
                    padding: '13px 28px 13px 22px',
                    cursor: 'pointer',
                    borderLeft: expandedMenu === menu.key ? '4px solid #1A73E8' : '4px solid transparent',
                    transition: 'all 0.2s',
                    letterSpacing: '-0.5px',
                    marginBottom: 2,
                    userSelect: 'none',
                  }}
                  onClick={() => {
                    if (menu.submenu) {
                      setExpandedMenu(expandedMenu === menu.key ? null : menu.key);
                    } else {
                      setExpandedMenu(menu.key);
                    }
                  }}
                >
                  {menu.icon}
                  {menu.label}
                  {menu.submenu ? (
                    expandedMenu === menu.key ? (
                      <FaChevronUp style={{ marginLeft: 'auto', color: '#1A73E8', fontSize: 15 }} />
                    ) : (
                      <FaChevronDown style={{ marginLeft: 'auto', color: '#7b8a9b', fontSize: 15 }} />
                    )
                  ) : null}
                </div>
                {/* Submenu */}
                {expandedMenu === menu.key && menu.submenu && (
                  <div style={{ marginLeft: 0, marginTop: 2 }}>
                    {menu.submenu.map(sub => (
                      <div
                        key={sub.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          fontWeight: 500,
                          fontSize: 15,
                          color: activeSubMenu === sub.key ? '#1A73E8' : '#38414a',
                          background: activeSubMenu === sub.key ? '#E3EAFD' : 'transparent',
                          padding: '10px 28px 10px 44px',
                          borderRadius: 8,
                          margin: '2px 0',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => setActiveSubMenu(sub.key)}
                      >
                        {sub.icon}
                        {sub.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Main Content */}
        <div style={{ flex: 1, padding: '48px 48px 48px 64px', position: 'relative', minHeight: '80vh', background: '#F8FAFC', fontWeight: PAGE_FONT_WEIGHT }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 28 }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: '#F5F7FA',
                  color: '#1A73E8',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 22px',
                  fontWeight: PAGE_FONT_WEIGHT,
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 1px 3px #E3EAFD40',
                  fontFamily: ZOHO_FONT,
                  transition: 'all 0.2s',
                  marginRight: 6,
                }}
              >
                <FaArrowLeft style={{ fontSize: 16 }} />
                Back
              </button>
            )}
            <FaUser style={{ fontSize: 30, color: '#1A73E8' }} />
            <span style={{ fontSize: '1.5rem', fontWeight: TITLE_FONT_WEIGHT, color: '#222', letterSpacing: '-1px', lineHeight: 1 }}>
              Sparkle ERP User Details
            </span>
          </div>
          {/* Show customer, vendor, employee, category, product, design, purity, packet, box, stone, or sku table if submenu is active */}
          {expandedMenu === 'create-member' && activeSubMenu === 'customer' ? (
            renderCustomerTable()
          ) : expandedMenu === 'create-member' && activeSubMenu === 'vendor' ? (
            renderVendorTable()
          ) : expandedMenu === 'create-member' && activeSubMenu === 'employees' ? (
            renderEmployeeTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'category' ? (
            renderCategoryTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'product' ? (
            renderProductTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'design' ? (
            renderDesignTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'purity' ? (
            renderPurityTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'packet' ? (
            renderPacketTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'box' ? (
            renderBoxTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'stone' ? (
            renderStoneTable()
          ) : expandedMenu === 'create-product' && activeSubMenu === 'sku' ? (
            renderSkuTable()
          ) : (
            <div style={{ color: '#7b8a9b', fontSize: 16, fontWeight: PAGE_FONT_WEIGHT, marginBottom: 18, marginLeft: onBack ? 60 : 0 }}>
              User details will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SparkleUserDetails; 