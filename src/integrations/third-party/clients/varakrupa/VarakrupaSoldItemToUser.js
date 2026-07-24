import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  FaLock,
  FaSync,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaShoppingBag,
  FaInfoCircle,
  FaChevronDown,
  FaList,
  FaArrowLeft,
} from 'react-icons/fa';
import { toSoniApiUrl } from '../../../../services/apiBaseConfig';
import {
  getVarakrupaStockData,
  getVarakrupaSoldProducts,
  getVarakrupaUserData,
  normalizeVarakrupaRows,
  normalizeVarakrupaUsers,
} from './varakrupaService';

const VRAKRUPA_ALLOWED_CLIENT = 'LS000563';
const TEAL = '#0d9488';
const TEAL_DARK = '#0f766e';

const UPDATE_SOLD_URL = toSoniApiUrl('/api/ProductMaster/UpdateRFIDTransactionDetails');

const PAGE_SIZE = 15;

const STOCK_COLUMNS = [
  { key: 'id', label: 'ID', width: 70 },
  { key: 'manufacturing_code', label: 'Item Code', width: 130 },
  { key: 'rfid', label: 'RFID Code', width: 120 },
  { key: 'product_type', label: 'Product Type', width: 120 },
  { key: 'category_name', label: 'Category', width: 160 },
  { key: 'collection_id', label: 'Collection ID', width: 110 },
  { key: 'gross_wt', label: 'Gross Wt', width: 100 },
  { key: 'net_wt', label: 'Net Wt', width: 100 },
  { key: 'image_name', label: 'Image', width: 180 },
  { key: 'Status', label: 'Status', width: 100 },
];

const getClientCodeFromAuth = () => {
  try {
    const stored = localStorage.getItem('userInfo');
    if (!stored) return '';
    const parsed = JSON.parse(stored);
    return (parsed.ClientCode || parsed.clientCode || parsed.clientcode || '')
      .trim()
      .toUpperCase();
  } catch {
    return '';
  }
};

const getCustomerDisplayName = (customer) => {
  if (!customer) return 'Unknown';
  if (customer.full_name) return String(customer.full_name).trim() || 'Unknown';
  if (customer.FirstName) {
    return `${customer.FirstName}${customer.LastName ? ` ${customer.LastName}` : ''}`.trim();
  }
  return customer.Name || customer.CustomerName || customer.CompanyName || 'Unknown';
};

/** Map Varakrupa product_data rows (Inventory_stock / SoldProducts) to table columns. */
const mapVarakrupaProductRowToDisplay = (row, index, status = 'ApiActive') => {
  const itemCode = String(row?.manufacturing_code ?? '').trim();
  const rfid = String(row?.rfid ?? '').trim();
  const image = String(row?.image_name ?? '').trim();
  const prefix = status === 'Sold' ? 'sold' : 'stock';

  return {
    ...row,
    id: row?.id ?? '',
    manufacturing_code: itemCode,
    rfid,
    product_type: row?.product_type ?? '',
    category_name: row?.category_name ?? '',
    collection_id: row?.collection_id ?? '',
    gross_wt: row?.gross_wt ?? '',
    net_wt: row?.net_wt ?? '',
    image_name: image,
    Status: status,
    _rowKey: `${prefix}-${row?.id || ''}-${itemCode}-${rfid}-${index}`,
    _itemCode: itemCode,
    _rfidValue: rfid,
  };
};

const thStyle = {
  padding: '9px 8px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#475569',
  borderBottom: '1px solid #dfe7f1',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '7px 8px',
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const VarakrupaSoldItemToUser = () => {
  const [clientCode, setClientCode] = useState('');
  const [allowed, setAllowed] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);

  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [searchStock, setSearchStock] = useState('');
  const [page, setPage] = useState(1);
  const [listMode, setListMode] = useState('active'); // 'active' | 'sold'

  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [soldLoading, setSoldLoading] = useState(false);
  const [soldResult, setSoldResult] = useState(null);

  useEffect(() => {
    const code = getClientCodeFromAuth();
    setClientCode(code);
    setAllowed(code === VRAKRUPA_ALLOWED_CLIENT);
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target)
      ) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!clientCode) return;
    setUsersLoading(true);
    setUsersError('');
    try {
      // User dropdown → Varakrupa UserData API
      const data = await getVarakrupaUserData();
      const mapped = normalizeVarakrupaUsers(data);

      if (mapped.length === 0 && data?.msg) {
        setUsersError(data.msg);
      }

      setUsers(mapped);
    } catch (err) {
      setUsers([]);
      setUsersError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Failed to load users.'
      );
    } finally {
      setUsersLoading(false);
    }
  }, [clientCode]);

  const fetchInventory = useCallback(async (mode = 'active') => {
    if (!clientCode) return;
    setInventoryLoading(true);
    setInventoryError('');
    setSoldResult(null);

    try {
      // Sold Item List → Varakrupa SoldProducts API
      if (mode === 'sold') {
        const data = await getVarakrupaSoldProducts();
        const rows = normalizeVarakrupaRows(data).map((row, index) =>
          mapVarakrupaProductRowToDisplay(row, index, 'Sold')
        );

        if (rows.length === 0 && data?.msg) {
          setInventoryError(data.msg);
        }

        setInventory(rows);
        setPage(1);
        setSelectedKeys(new Set());
        setSearchStock('');
        return;
      }

      // Active inventory → Varakrupa Inventory_stock API
      const data = await getVarakrupaStockData();
      const rows = normalizeVarakrupaRows(data).map((row, index) =>
        mapVarakrupaProductRowToDisplay(row, index, 'ApiActive')
      );

      if (rows.length === 0 && data?.msg) {
        setInventoryError(data.msg);
      }

      setInventory(rows);
      setPage(1);
      setSelectedKeys(new Set());
      setSearchStock('');
    } catch (err) {
      setInventory([]);
      setInventoryError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.response?.data?.msg ||
          err?.message ||
          'Failed to load inventory.'
      );
    } finally {
      setInventoryLoading(false);
    }
  }, [clientCode]);

  const openSoldItemList = async () => {
    setListMode('sold');
    await fetchInventory('sold');
  };

  const backToActiveInventory = async () => {
    setListMode('active');
    await fetchInventory('active');
  };

  useEffect(() => {
    if (!allowed || !clientCode) return;
    fetchUsers();
    fetchInventory('active');
  }, [allowed, clientCode, fetchUsers, fetchInventory]);

  const selectedUser = useMemo(
    () => users.find((u) => String(u.Id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = getCustomerDisplayName(u).toLowerCase();
      const id = String(u.user_id || u.Id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [users, userSearch]);

  const filteredStock = useMemo(() => {
    const q = searchStock.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((row) =>
      STOCK_COLUMNS.some((col) => {
        const value = row[col.key];
        return value != null && String(value).toLowerCase().includes(q);
      })
    );
  }, [inventory, searchStock]);

  const totalPages = Math.max(1, Math.ceil(filteredStock.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedStock = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStock.slice(start, start + PAGE_SIZE);
  }, [filteredStock, page]);

  const allVisibleSelected =
    pagedStock.length > 0 &&
    pagedStock.every((item) => selectedKeys.has(item._rowKey));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        pagedStock.forEach((item) => next.delete(item._rowKey));
        return next;
      });
      return;
    }
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      pagedStock.forEach((item) => next.add(item._rowKey));
      return next;
    });
  };

  const toggleRow = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectUser = (user) => {
    setSelectedUserId(String(user.Id));
    setUserSearch(getCustomerDisplayName(user));
    setUserDropdownOpen(false);
    setSoldResult(null);
  };

  const handleClearUser = () => {
    setSelectedUserId('');
    setUserSearch('');
    setSoldResult(null);
  };

  const handleMarkSold = async () => {
    setSoldResult(null);

    if (!selectedUserId || !selectedUser) {
      setSoldResult({
        success: false,
        message: 'Please select a user before marking items as sold.',
      });
      return;
    }

    if (selectedKeys.size === 0) {
      setSoldResult({
        success: false,
        message: 'Please select at least one inventory item to sell.',
      });
      return;
    }

    const selectedItems = inventory.filter((item) =>
      selectedKeys.has(item._rowKey)
    );

    const validItems = selectedItems
      .map((item) => ({
        itemCode: item._itemCode || item.manufacturing_code,
        rfid: item._rfidValue || item.rfid,
      }))
      .filter(({ itemCode }) => itemCode);

    if (validItems.length === 0) {
      setSoldResult({
        success: false,
        message: 'Selected items do not have a valid item code.',
      });
      return;
    }

    if (!localStorage.getItem('token')) {
      setSoldResult({ success: false, message: 'Please log in again.' });
      return;
    }

    const userName = getCustomerDisplayName(selectedUser);
    const confirmed = window.confirm(
      `Sell ${validItems.length} item(s) to "${userName}"?\n\nThis will mark the selected inventory as Sold.`
    );
    if (!confirmed) return;

    setSoldLoading(true);

    try {
      const payload = validItems.map(({ itemCode, rfid }) => ({
        client_code: clientCode,
        itemcode: itemCode,
        ...(rfid ? { RFIDNumber: rfid } : {}),
        status: 'Sold',
        CustomerId: String(selectedUser.Id ?? ''),
        CustomerName: userName,
      }));

      const response = await axios.post(UPDATE_SOLD_URL, payload, {
        headers: authHeaders(),
      });

      const apiStatus = response.data?.status?.toLowerCase?.();
      const isSuccess =
        response.data &&
        (apiStatus === 'success' ||
          apiStatus === 'partial' ||
          response.data.success !== false);

      if (!isSuccess) {
        throw new Error(
          response.data?.message ||
            response.data?.Message ||
            'Failed to mark items as sold.'
        );
      }

      const updatedCount =
        response.data?.updatedItems ??
        response.data?.UpdatedItems ??
        validItems.length;

      setSoldResult({
        success: true,
        message: `Successfully sold ${updatedCount} item(s) to ${userName}.`,
      });

      setSelectedKeys(new Set());
      await fetchInventory('active');
    } catch (err) {
      setSoldResult({
        success: false,
        message:
          err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          'Failed to mark items as sold.',
      });
    } finally {
      setSoldLoading(false);
    }
  };

  if (!allowed) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'Inter, Poppins, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: '#d97706',
            }}
          >
            <FaLock size={28} />
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: 8,
            }}
          >
            Access restricted
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#64748b',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            Sold Item to User is available only for authorized clients.
          </p>
          {clientCode && (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              Your client code: <strong>{clientCode}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes soldSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          padding: '0 0 10px',
          fontFamily: 'Inter, Poppins, sans-serif',
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
            }}
          >
            <FaShoppingBag size={18} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#1e293b',
                margin: 0,
              }}
            >
              Sold Item to User
            </h1>
            <p
              style={{
                fontSize: 14,
                color: '#64748b',
                margin: '4px 0 0 0',
              }}
            >
              Select a user and sell inventory items - {VRAKRUPA_ALLOWED_CLIENT}
            </p>
          </div>
        </div>

        <section
          style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #dfe7f1',
            overflow: 'hidden',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #dfe7f1',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
              }}
            >
              {listMode === 'sold'
                ? 'Sold Item List'
                : 'Sold Item to User - Inventory'}
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              {listMode === 'active' && (
              <div ref={userDropdownRef} style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: 220,
                    height: 32,
                    border: '1px solid #dfe7f1',
                    borderRadius: 5,
                    background: '#fff',
                    overflow: 'hidden',
                  }}
                >
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserDropdownOpen(true);
                      if (selectedUserId) setSelectedUserId('');
                    }}
                    onFocus={() => setUserDropdownOpen(true)}
                    placeholder={
                      usersLoading ? 'Loading users...' : 'Search & select user'
                    }
                    disabled={usersLoading}
                    style={{
                      flex: 1,
                      height: '100%',
                      border: 'none',
                      outline: 'none',
                      padding: '0 10px',
                      fontSize: 13,
                      color: '#0f172a',
                      background: 'transparent',
                      minWidth: 0,
                    }}
                  />
                  {selectedUserId ? (
                    <button
                      type="button"
                      onClick={handleClearUser}
                      title="Clear"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0 6px',
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  ) : (
                    <FaChevronDown
                      size={10}
                      style={{ color: '#94a3b8', marginRight: 8 }}
                    />
                  )}
                </div>

                {userDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      width: 280,
                      maxHeight: 240,
                      overflowY: 'auto',
                      background: '#fff',
                      border: '1px solid #dfe7f1',
                      borderRadius: 6,
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                      zIndex: 20,
                    }}
                  >
                    {filteredUsers.length === 0 ? (
                      <div
                        style={{
                          padding: '12px 14px',
                          fontSize: 13,
                          color: '#94a3b8',
                        }}
                      >
                        {usersLoading ? 'Loading...' : 'No users found'}
                      </div>
                    ) : (
                      filteredUsers.map((user) => {
                        const name = getCustomerDisplayName(user);
                        const userId = user.user_id || user.Id || '';
                        const isSelected =
                          String(user.Id) === String(selectedUserId);
                        return (
                          <button
                            key={user.Id}
                            type="button"
                            onClick={() => handleSelectUser(user)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              border: 'none',
                              borderBottom: '1px solid #f1f5f9',
                              background: isSelected ? '#ecfdf5' : '#fff',
                              padding: '8px 12px',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#0f172a',
                              }}
                            >
                              {name}
                            </div>
                            {userId ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#64748b',
                                  marginTop: 2,
                                }}
                              >
                                ID: {userId}
                              </div>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              )}

              {listMode === 'sold' && (
                <button
                  type="button"
                  onClick={backToActiveInventory}
                  disabled={inventoryLoading}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: TEAL_DARK,
                    background: '#ecfdf5',
                    border: '1px solid #99f6e4',
                    borderRadius: 6,
                    cursor: inventoryLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                    boxSizing: 'border-box',
                  }}
                >
                  <FaArrowLeft size={12} />
                  Back to Inventory
                </button>
              )}

              <button
                type="button"
                onClick={() => fetchInventory(listMode)}
                disabled={inventoryLoading}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: inventoryLoading ? '#94a3b8' : TEAL,
                  border: 'none',
                  borderRadius: 6,
                  cursor: inventoryLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 32,
                  boxSizing: 'border-box',
                }}
              >
                {inventoryLoading ? (
                  <FaSpinner
                    size={14}
                    style={{ animation: 'soldSpin 1s linear infinite' }}
                  />
                ) : (
                  <FaSync size={14} />
                )}
                Refresh
              </button>

              {listMode === 'active' && (
                <button
                  type="button"
                  onClick={handleMarkSold}
                  disabled={
                    soldLoading || selectedKeys.size === 0 || !selectedUserId
                  }
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#fff',
                    background:
                      soldLoading || selectedKeys.size === 0 || !selectedUserId
                        ? '#94a3b8'
                        : TEAL_DARK,
                    border: 'none',
                    borderRadius: 6,
                    cursor:
                      soldLoading || selectedKeys.size === 0 || !selectedUserId
                        ? 'not-allowed'
                        : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                    boxSizing: 'border-box',
                  }}
                >
                  {soldLoading ? (
                    <FaSpinner
                      size={14}
                      style={{ animation: 'soldSpin 1s linear infinite' }}
                    />
                  ) : (
                    <FaShoppingBag size={14} />
                  )}
                  Sold{selectedKeys.size > 0 ? ` (${selectedKeys.size})` : ''}
                </button>
              )}

              <button
                type="button"
                onClick={openSoldItemList}
                disabled={inventoryLoading || listMode === 'sold'}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background:
                    inventoryLoading || listMode === 'sold'
                      ? '#94a3b8'
                      : '#6366f1',
                  border: 'none',
                  borderRadius: 6,
                  cursor:
                    inventoryLoading || listMode === 'sold'
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 32,
                  boxSizing: 'border-box',
                }}
              >
                <FaList size={14} />
                Sold Item List
              </button>
            </div>
          </div>

          {usersError && (
            <div
              style={{
                padding: 12,
                margin: 12,
                background: '#fef2f2',
                borderRadius: 8,
                fontSize: 13,
                color: '#dc2626',
              }}
            >
              {usersError}
            </div>
          )}

          {soldResult && (
            <div
              style={{
                padding: 12,
                margin: 12,
                background: soldResult.success ? '#f0fdf4' : '#fef2f2',
                borderRadius: 8,
                border: `1px solid ${soldResult.success ? '#86efac' : '#fca5a5'}`,
                fontSize: 13,
                color: soldResult.success ? '#166534' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {soldResult.success ? (
                <FaCheckCircle />
              ) : (
                <FaExclamationCircle />
              )}
              {soldResult.message}
            </div>
          )}

          {inventoryError && (
            <div
              style={{
                padding: 12,
                margin: 12,
                background: '#fef2f2',
                borderRadius: 8,
                fontSize: 13,
                color: '#dc2626',
              }}
            >
              {inventoryError}
            </div>
          )}

          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid #dfe7f1',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="Search in table..."
              value={searchStock}
              onChange={(e) => {
                setSearchStock(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '8px 12px',
                fontSize: 13,
                border: '1px solid #dfe7f1',
                borderRadius: 5,
                width: 184,
                height: 32,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: 13, color: '#475569' }}>
              {filteredStock.length} of {inventory.length} items
              {listMode === 'sold' ? ' · Sold items' : ''}
              {listMode === 'active' && selectedUser
                ? ` · Selling to: ${getCustomerDisplayName(selectedUser)}`
                : ''}
              {listMode === 'active' && selectedKeys.size > 0
                ? ` · ${selectedKeys.size} selected`
                : ''}
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                minWidth: 1120,
              }}
            >
              <thead
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#f1f5f9',
                  zIndex: 1,
                }}
              >
                <tr>
                  {listMode === 'active' && (
                    <th style={{ ...thStyle, width: 36 }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        disabled={pagedStock.length === 0 || inventoryLoading}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th style={{ ...thStyle, width: 50 }}>S.No</th>
                  {STOCK_COLUMNS.map((col) => (
                    <th key={col.key} style={{ ...thStyle, width: col.width }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventoryLoading ? (
                  <tr>
                    <td
                      colSpan={(listMode === 'active' ? 2 : 1) + STOCK_COLUMNS.length}
                      style={{
                        padding: 24,
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: 14,
                      }}
                    >
                      <FaSpinner
                        style={{
                          animation: 'soldSpin 1s linear infinite',
                          marginRight: 8,
                        }}
                      />
                      {listMode === 'sold'
                        ? 'Loading sold items...'
                        : 'Loading inventory...'}
                    </td>
                  </tr>
                ) : pagedStock.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(listMode === 'active' ? 2 : 1) + STOCK_COLUMNS.length}
                      style={{
                        padding: 24,
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: 14,
                      }}
                    >
                      {inventory.length === 0
                        ? listMode === 'sold'
                          ? 'No sold items found.'
                          : 'No inventory items found.'
                        : 'No rows match your search.'}
                    </td>
                  </tr>
                ) : (
                  pagedStock.map((row, idx) => {
                    const checked = selectedKeys.has(row._rowKey);
                    const srNo = (page - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr
                        key={row._rowKey}
                        onClick={
                          listMode === 'active'
                            ? () => toggleRow(row._rowKey)
                            : undefined
                        }
                        style={{
                          background:
                            listMode === 'active' && checked
                              ? '#ecfdf5'
                              : idx % 2 === 0
                                ? '#ffffff'
                                : '#f8fafc',
                          borderBottom: '1px solid #dfe7f1',
                          cursor: listMode === 'active' ? 'pointer' : 'default',
                        }}
                      >
                        {listMode === 'active' && (
                          <td
                            style={{ ...tdStyle, color: '#64748b' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(row._rowKey)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        <td style={{ ...tdStyle, color: '#64748b' }}>{srNo}</td>
                        {STOCK_COLUMNS.map((col) => {
                          const value = row[col.key];
                          if (col.key === 'image_name') {
                            return (
                              <td
                                key={col.key}
                                style={{
                                  ...tdStyle,
                                  maxWidth: col.width,
                                }}
                                title={value ? String(value) : ''}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {value ? (
                                  <a
                                    href={String(value)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: TEAL_DARK,
                                      fontWeight: 600,
                                    }}
                                  >
                                    View Image
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>
                            );
                          }
                          if (col.key === 'Status') {
                            const isSold =
                              String(value || '').toLowerCase() === 'sold';
                            return (
                              <td key={col.key} style={tdStyle}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: isSold ? '#fef2f2' : '#ecfdf5',
                                    color: isSold ? '#b91c1c' : '#047857',
                                  }}
                                >
                                  {value != null && value !== ''
                                    ? String(value)
                                    : '-'}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td
                              key={col.key}
                              style={{
                                ...tdStyle,
                                maxWidth: col.width,
                              }}
                              title={value != null ? String(value) : ''}
                            >
                              {value != null && value !== ''
                                ? String(value)
                                : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredStock.length > 0 && (
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid #dfe7f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                background: '#f8fafc',
              }}
            >
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, filteredStock.length)} of{' '}
                {filteredStock.length} · Page {page} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={page <= 1 || inventoryLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #dfe7f1',
                    background: '#fff',
                    color: TEAL_DARK,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      page <= 1 || inventoryLoading ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 || inventoryLoading ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || inventoryLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #dfe7f1',
                    background: '#fff',
                    color: TEAL_DARK,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      page >= totalPages || inventoryLoading
                        ? 'not-allowed'
                        : 'pointer',
                    opacity: page >= totalPages || inventoryLoading ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        <div
          style={{
            padding: 18,
            background: 'linear-gradient(135deg, #dffcf7 0%, #ccfbf1 100%)',
            borderRadius: 8,
            border: '1px solid #8fe9da',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <FaInfoCircle
            size={20}
            style={{ color: TEAL, flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div
              style={{
                fontWeight: 700,
                color: '#115e59',
                marginBottom: 5,
                fontSize: 14,
              }}
            >
              Authorized client
            </div>
            <p
              style={{
                fontSize: 13,
                color: '#064e3b',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              You are viewing this page as client <strong>{clientCode}</strong>.
              Select a user, choose inventory items, then click{' '}
              <strong>Sold</strong> to mark them sold for that user.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default VarakrupaSoldItemToUser;
