import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getGetAllCustomerUrl, getAddCustomerUrl } from '../services/customerOnboardingApi';
import { assignBoxRfidTag } from '../services/boxRfidApi';
import { rfidService } from '../services/rfidService';
import {
  FaTags,
  FaBox,
  FaPaintBrush,
  FaGem,
  FaCalculator,
  FaArchive,
  FaMapMarkerAlt,
  FaSpinner,
  FaChevronRight,
  FaCheck,
  FaRedoAlt,
  FaTimes,
  FaCubes,
  FaSearch,
  FaEdit,
  FaTrashAlt,
  FaRupeeSign,
  FaUserTie,
  FaStore,
  FaUserFriends,
} from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://rrgold.loyalstring.co.in';
const API_BASE_SONI = 'https://soni.loyalstring.co.in';

const MASTER_OPTIONS = [
  { id: 'category', label: 'Category', icon: FaTags, color: '#0d9488' },
  { id: 'product', label: 'Product', icon: FaBox, color: '#2563eb' },
  { id: 'design', label: 'Design', icon: FaPaintBrush, color: '#7c3aed' },
  { id: 'purity', label: 'Purity', icon: FaGem, color: '#d97706' },
  { id: 'counter', label: 'Counter', icon: FaCalculator, color: '#059669' },
  { id: 'box', label: 'Box', icon: FaArchive, color: '#dc2626' },
  { id: 'packet', label: 'Packet', icon: FaCubes, color: '#8b5cf6' },
  { id: 'branch', label: 'Branch', icon: FaMapMarkerAlt, color: '#0891b2' },
  { id: 'rates', label: 'Rates', icon: FaRupeeSign, color: '#0d9488' },
];

/** Members: Employee, Vendor, Customer (GetAll + Add APIs). */
const MEMBER_OPTIONS = [
  { id: 'employee', label: 'Create Employee', icon: FaUserTie, color: '#0ea5e9' },
  { id: 'vendor', label: 'Create Vendor', icon: FaStore, color: '#a855f7' },
  { id: 'customer', label: 'Create Customer', icon: FaUserFriends, color: '#15803d' },
];

const ALL_NAV_OPTIONS = [...MASTER_OPTIONS, ...MEMBER_OPTIONS];

const BRANCH_TYPES = [{ id: 'Main', name: 'Main' }, { id: 'Sub', name: 'Sub' }];
const STATUS_OPTIONS = [{ id: 'Active', name: 'Active' }, { id: 'Inactive', name: 'Inactive' }];
const COUNTRY_OPTIONS = [{ id: 'India', name: 'India' }];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const ROLE_OPTIONS = ['Admin', 'Manager', 'Staff', 'Operator', 'Sales'];
const DEPARTMENT_OPTIONS = ['Sales', 'Inventory', 'Accounts', 'HR', 'Operations'];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry',
].sort();

const getInitialVendorForm = () => ({
  vendorName: '',
  companyName: '',
  email: '',
  contactNumber: '',
  aadharNumber: '0',
  panNumber: '',
  remarks: '',
  street: '',
  area: '',
  town: '',
  city: '',
  country: 'India',
  state: '',
  pincode: '',
});

const getInitialEmployeeForm = () => ({
  firstName: '',
  lastName: '',
  empEmail: '',
  contactNo: '',
  streetAddress: '',
  town: '',
  country: 'India',
  state: '',
  city: '',
  aadharNo: '',
  panNo: '',
  joiningDate: '',
  dob: '',
  gender: '',
  branch: '',
  department: '',
  counter: '',
  roles: '',
  reportingTo: '',
});

const getInitialCustomerForm = () => ({
  firstName: '',
  lastName: '',
  companyName: '',
  email: '',
  contactNumber: '',
  aadharNumber: '0',
  panNumber: '',
  remarks: '',
  street: '',
  area: '',
  town: '',
  city: '',
  country: 'India',
  state: '',
  pincode: '',
});

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const getClientCode = () => {
  try {
    const u = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return u.ClientCode || u.clientCode || u.clientcode || '';
  } catch {
    return '';
  }
};

const getUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const toIntOrUndefined = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
};

/** CompanyId is numeric master id — never ClientCode string */
const resolveCompanyId = (branches = []) => {
  const clientCode = String(getClientCode() || '').trim().toUpperCase();
  const toCompanyId = (value) => {
    if (value == null || value === '') return undefined;
    const raw = String(value).trim();
    if (clientCode && raw.toUpperCase() === clientCode) return undefined;
    return toIntOrUndefined(raw);
  };

  for (const branch of branches) {
    const fromBranch = toCompanyId(branch?.CompanyId ?? branch?.companyId);
    if (fromBranch !== undefined) return fromBranch;
  }

  const u = getUserInfo();
  const fromUser = toCompanyId(u.CompanyId ?? u.companyId);
  if (fromUser !== undefined) return fromUser;

  return 1;
};

const firstMasterId = (items) => {
  const row = (items || [])[0];
  return toIntOrUndefined(row?.Id ?? row?.id);
};

const rfidTextToHex = (str) =>
  String(str || '')
    .split('')
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

const parseTidFromBarcodeResponse = (res) => {
  if (res == null) return null;
  if (typeof res === 'string') return res.trim();
  if (typeof res.tidValue === 'string') return res.tidValue.trim();
  if (typeof res.Tid === 'string') return res.Tid.trim();
  if (typeof res.TID === 'string') return res.TID.trim();
  if (Array.isArray(res) && res.length > 0) {
    const first = res[0];
    const tid = typeof first === 'string' ? first : (first?.tidValue ?? first?.Tid ?? first?.TID ?? null);
    return tid != null ? String(tid).trim() : null;
  }
  return null;
};

const CreateMasters = () => {
  const [activeOption, setActiveOption] = useState('category');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [boxRfidTagMode, setBoxRfidTagMode] = useState('reuse');
  const [boxRfidLookupLoading, setBoxRfidLookupLoading] = useState(false);
  const [boxRfidLookupError, setBoxRfidLookupError] = useState('');
  const boxRfidLookupTimerRef = useRef(null);
  const [dropdownData, setDropdownData] = useState({
    categories: [],
    products: [],
    designs: [],
    purities: [],
    branches: [],
    counters: [],
    boxes: [],
    packets: [],
  });
  const [navOpen, setNavOpen] = useState(false);
  const [boxPackets, setBoxPackets] = useState([]);
  const [listSearch, setListSearch] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const formCardRef = React.useRef(null);

  const clientCode = getClientCode();

  // Daily Rates (Category + Purity) module
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesSaving, setRatesSaving] = useState(false);
  const [dailyRatesRows, setDailyRatesRows] = useState([]);
  const [ratesByPurityId, setRatesByPurityId] = useState({});
  const [initialRatesByPurityId, setInitialRatesByPurityId] = useState({});

  const [vendorForm, setVendorForm] = useState(getInitialVendorForm);
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [vendorRows, setVendorRows] = useState([]);
  const [vendorListLoading, setVendorListLoading] = useState(false);
  const [vendorListSearch, setVendorListSearch] = useState('');
  const [vendorListPage, setVendorListPage] = useState(1);
  const [vendorListPageSize, setVendorListPageSize] = useState(10);
  const [employeeForm, setEmployeeForm] = useState(getInitialEmployeeForm);
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeRows, setEmployeeRows] = useState([]);
  const [employeeListLoading, setEmployeeListLoading] = useState(false);
  const [employeeListSearch, setEmployeeListSearch] = useState('');
  const [employeeListPage, setEmployeeListPage] = useState(1);
  const [employeeListPageSize, setEmployeeListPageSize] = useState(10);
  const [customerForm, setCustomerForm] = useState(getInitialCustomerForm);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerRows, setCustomerRows] = useState([]);
  const [customerListLoading, setCustomerListLoading] = useState(false);
  const [customerListSearch, setCustomerListSearch] = useState('');
  const [customerListPage, setCustomerListPage] = useState(1);
  const [customerListPageSize, setCustomerListPageSize] = useState(10);

  const normalizeListResponse = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.result)) return data.result;
    if (Array.isArray(data.Result)) return data.Result;
    return [];
  };

  const fetchVendors = useCallback(async () => {
    if (!clientCode) return;
    setVendorListLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/ProductMaster/GetAllPartyDetails`,
        { ClientCode: clientCode },
        { headers: getAuthHeaders() }
      );
      setVendorRows(normalizeListResponse(res?.data));
    } catch (e) {
      console.warn('GetAllPartyDetails error in CreateMasters:', e?.response?.data || e.message);
      setVendorRows([]);
    } finally {
      setVendorListLoading(false);
    }
  }, [clientCode]);

  const fetchEmployees = useCallback(async () => {
    if (!clientCode) return;
    setEmployeeListLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/ClientOnboarding/GetAllEmployee`,
        { ClientCode: clientCode },
        { headers: getAuthHeaders() }
      );
      setEmployeeRows(normalizeListResponse(res?.data));
    } catch (e) {
      console.warn('GetAllEmployee:', e?.response?.data || e.message);
      setEmployeeRows([]);
    } finally {
      setEmployeeListLoading(false);
    }
  }, [clientCode]);

  const fetchCustomers = useCallback(async () => {
    if (!clientCode) return;
    setCustomerListLoading(true);
    try {
      const res = await axios.post(
        getGetAllCustomerUrl(),
        { ClientCode: clientCode },
        { headers: getAuthHeaders() }
      );
      setCustomerRows(normalizeListResponse(res?.data));
    } catch (e) {
      console.warn('GetAllCustomer:', e?.response?.data || e.message);
      setCustomerRows([]);
    } finally {
      setCustomerListLoading(false);
    }
  }, [clientCode]);

  useEffect(() => {
    if (activeOption === 'vendor') {
      fetchVendors();
      setVendorListPage(1);
    }
  }, [activeOption, fetchVendors]);

  useEffect(() => {
    if (activeOption === 'employee') {
      fetchEmployees();
      setEmployeeListPage(1);
    }
  }, [activeOption, fetchEmployees]);

  useEffect(() => {
    if (activeOption === 'customer') {
      fetchCustomers();
      setCustomerListPage(1);
    }
  }, [activeOption, fetchCustomers]);

  const vendorDisplay = (row, ...keys) => {
    for (const k of keys) {
      const v = row[k];
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
    }
    return '—';
  };

  const employeeDisplay = (row, ...keys) => {
    for (const k of keys) {
      const v = row[k];
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
    }
    return '—';
  };

  const customerDisplay = (row, ...keys) => {
    for (const k of keys) {
      const v = row[k];
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
    }
    return '—';
  };

  const filteredVendorRows = useMemo(() => {
    if (!vendorListSearch.trim()) return vendorRows;
    const q = vendorListSearch.trim().toLowerCase();
    return vendorRows.filter((row) => {
      const blob = [
        vendorDisplay(row, 'PartyName', 'VendorName', 'vendorName'),
        vendorDisplay(row, 'CompanyName', 'companyName'),
        vendorDisplay(row, 'ContactNumber', 'Mobile', 'Phone'),
        vendorDisplay(row, 'City', 'city'),
        vendorDisplay(row, 'State', 'state'),
        vendorDisplay(row, 'VendorType', 'vendorType'),
        vendorDisplay(row, 'GSTNumber', 'GstNumber', 'GSTIN'),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [vendorRows, vendorListSearch]);

  const vendorTotalPages = Math.max(1, Math.ceil(filteredVendorRows.length / vendorListPageSize));
  const vendorSafePage = Math.min(vendorListPage, vendorTotalPages) || 1;
  const paginatedVendorRows = useMemo(() => {
    const start = (vendorSafePage - 1) * vendorListPageSize;
    return filteredVendorRows.slice(start, start + vendorListPageSize);
  }, [filteredVendorRows, vendorSafePage, vendorListPageSize]);

  const filteredEmployeeRows = useMemo(() => {
    if (!employeeListSearch.trim()) return employeeRows;
    const q = employeeListSearch.trim().toLowerCase();
    return employeeRows.filter((row) => {
      const blob = [
        employeeDisplay(row, 'FirstName', 'firstName'),
        employeeDisplay(row, 'LastName', 'lastName'),
        employeeDisplay(row, 'EmployeeEmail', 'Email', 'empEmail'),
        employeeDisplay(row, 'ContactNumber', 'MobileNumber', 'contactNo'),
        employeeDisplay(row, 'BranchName', 'branch'),
        employeeDisplay(row, 'Department', 'department'),
        employeeDisplay(row, 'CounterName', 'counter'),
        employeeDisplay(row, 'Roles', 'Role', 'roles'),
      ].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [employeeRows, employeeListSearch]);

  const employeeTotalPages = Math.max(1, Math.ceil(filteredEmployeeRows.length / employeeListPageSize));
  const employeeSafePage = Math.min(employeeListPage, employeeTotalPages) || 1;
  const paginatedEmployeeRows = useMemo(() => {
    const start = (employeeSafePage - 1) * employeeListPageSize;
    return filteredEmployeeRows.slice(start, start + employeeListPageSize);
  }, [filteredEmployeeRows, employeeSafePage, employeeListPageSize]);

  const filteredCustomerRows = useMemo(() => {
    if (!customerListSearch.trim()) return customerRows;
    const q = customerListSearch.trim().toLowerCase();
    return customerRows.filter((row) => {
      const blob = [
        customerDisplay(row, 'FirstName', 'firstName'),
        customerDisplay(row, 'LastName', 'lastName'),
        customerDisplay(row, 'Name', 'CustomerName'),
        customerDisplay(row, 'Email', 'email'),
        customerDisplay(row, 'Mobile', 'MobileNumber', 'ContactNumber'),
        customerDisplay(row, 'CompanyName', 'companyName'),
        customerDisplay(row, 'City', 'city'),
        customerDisplay(row, 'State', 'state'),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [customerRows, customerListSearch]);

  const customerTotalPages = Math.max(1, Math.ceil(filteredCustomerRows.length / customerListPageSize));
  const customerSafePage = Math.min(customerListPage, customerTotalPages) || 1;
  const paginatedCustomerRows = useMemo(() => {
    const start = (customerSafePage - 1) * customerListPageSize;
    return filteredCustomerRows.slice(start, start + customerListPageSize);
  }, [filteredCustomerRows, customerSafePage, customerListPageSize]);

  const updateVendorField = useCallback((key, value) => {
    setVendorForm((prev) => ({ ...prev, [key]: value }));
  }, []);
  const updateEmployeeField = useCallback((key, value) => {
    setEmployeeForm((prev) => ({ ...prev, [key]: value }));
  }, []);
  const updateCustomerField = useCallback((key, value) => {
    setCustomerForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleVendorReset = useCallback(() => {
    setVendorForm(getInitialVendorForm());
    toast.info('Form reset.');
  }, []);
  const handleEmployeeReset = useCallback(() => {
    setEmployeeForm(getInitialEmployeeForm());
    toast.info('Form reset.');
  }, []);
  const handleCustomerReset = useCallback(() => {
    setCustomerForm(getInitialCustomerForm());
    toast.info('Form reset.');
  }, []);

  const handleVendorSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const v = vendorForm;
      if (!String(v.vendorName || '').trim()) {
        toast.error('Vendor Name is required.');
        return;
      }
      if (!String(v.companyName || '').trim()) {
        toast.error('Company Name is required.');
        return;
      }
      if (!String(v.contactNumber || '').trim()) {
        toast.error('Contact Number is required.');
        return;
      }
      if (!String(v.country || '').trim()) {
        toast.error('Country is required.');
        return;
      }
      if (!String(v.state || '').trim()) {
        toast.error('State is required.');
        return;
      }
      const pin = String(v.pincode || '').trim();
      if (pin && !/^\d{6}$/.test(pin)) {
        toast.error('Pincode must be 6 digits.');
        return;
      }

      setVendorSubmitting(true);
      const payload = {
        ClientCode: clientCode,
        VendorName: v.vendorName.trim(),
        CompanyName: v.companyName.trim(),
        Email: v.email.trim(),
        ContactNumber: v.contactNumber.trim(),
        AadharNumber: v.aadharNumber,
        PanNumber: v.panNumber.trim(),
        Remarks: v.remarks.trim(),
        Street: v.street.trim(),
        Area: v.area.trim(),
        Town: v.town.trim(),
        City: v.city.trim(),
        Country: v.country,
        State: v.state,
        Pincode: v.pincode.trim(),
      };

      try {
        await axios.post(`${API_BASE}/api/ClientOnboarding/AddVendor`, payload, { headers: getAuthHeaders() });
        toast.success('Vendor saved successfully.');
        setVendorForm(getInitialVendorForm());
        fetchVendors();
      } catch (err) {
        console.warn('AddVendor API:', err?.response?.data || err.message);
        const msg = err?.response?.data?.Message || err?.response?.data?.message;
        if (msg) toast.error(String(msg));
        else toast.info('Vendor form is ready. Confirm the Add Vendor API path and field names with your backend.');
      } finally {
        setVendorSubmitting(false);
      }
    },
    [vendorForm, clientCode, fetchVendors]
  );

  const handleEmployeeSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const emp = employeeForm;
      if (!emp.firstName.trim()) return toast.error('First Name is required.');
      if (!emp.lastName.trim()) return toast.error('Last Name is required.');
      if (!emp.empEmail.trim()) return toast.error('Emp Email is required.');
      if (!emp.contactNo.trim()) return toast.error('Contact Number is required.');
      if (!emp.streetAddress.trim()) return toast.error('Street Address is required.');
      if (!emp.country.trim()) return toast.error('Country is required.');
      if (!emp.state.trim()) return toast.error('State is required.');
      if (!emp.city.trim()) return toast.error('City is required.');
      if (!emp.branch) return toast.error('Branch is required.');
      if (!emp.department) return toast.error('Department is required.');
      if (!emp.counter) return toast.error('Counter is required.');
      if (!emp.roles) return toast.error('Roles is required.');

      const payload = {
        ClientCode: clientCode,
        FirstName: emp.firstName.trim(),
        LastName: emp.lastName.trim(),
        EmployeeEmail: emp.empEmail.trim(),
        ContactNumber: emp.contactNo.trim(),
        StreetAddress: emp.streetAddress.trim(),
        Town: emp.town.trim(),
        Country: emp.country,
        State: emp.state,
        City: emp.city.trim(),
        AadharNumber: emp.aadharNo.trim(),
        PanNumber: emp.panNo.trim(),
        JoiningDate: emp.joiningDate || null,
        DateOfBirth: emp.dob || null,
        Gender: emp.gender || '',
        BranchId: emp.branch || '',
        Department: emp.department || '',
        CounterId: emp.counter || '',
        Roles: emp.roles || '',
        ReportingTo: emp.reportingTo || '',
      };

      setEmployeeSubmitting(true);
      try {
        await axios.post(`${API_BASE}/api/ClientOnboarding/AddEmployee`, payload, { headers: getAuthHeaders() });
        toast.success('Employee saved successfully.');
        setEmployeeForm(getInitialEmployeeForm());
        fetchEmployees();
      } catch (err) {
        console.warn('AddEmployee API:', err?.response?.data || err.message);
        const msg = err?.response?.data?.Message || err?.response?.data?.message;
        if (msg) toast.error(String(msg));
        else toast.info('Employee form is ready. Confirm the Add Employee API path and fields with backend.');
      } finally {
        setEmployeeSubmitting(false);
      }
    },
    [employeeForm, clientCode, fetchEmployees]
  );

  const handleCustomerSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const c = customerForm;
      if (!String(c.firstName || '').trim()) {
        toast.error('First Name is required.');
        return;
      }
      if (!String(c.lastName || '').trim()) {
        toast.error('Last Name is required.');
        return;
      }
      if (!String(c.contactNumber || '').trim()) {
        toast.error('Mobile / Contact Number is required.');
        return;
      }
      if (!String(c.country || '').trim()) {
        toast.error('Country is required.');
        return;
      }
      if (!String(c.state || '').trim()) {
        toast.error('State is required.');
        return;
      }
      const pin = String(c.pincode || '').trim();
      if (pin && !/^\d{6}$/.test(pin)) {
        toast.error('Pincode must be 6 digits.');
        return;
      }

      setCustomerSubmitting(true);
      const payload = {
        ClientCode: clientCode,
        FirstName: c.firstName.trim(),
        LastName: c.lastName.trim(),
        CompanyName: String(c.companyName || '').trim(),
        Email: String(c.email || '').trim(),
        Mobile: c.contactNumber.trim(),
        AadharNumber: c.aadharNumber,
        PanNumber: String(c.panNumber || '').trim(),
        Remarks: String(c.remarks || '').trim(),
        Street: String(c.street || '').trim(),
        Area: String(c.area || '').trim(),
        Town: String(c.town || '').trim(),
        City: String(c.city || '').trim(),
        Country: c.country,
        State: c.state,
        Pincode: pin,
      };

      try {
        await axios.post(getAddCustomerUrl(), payload, { headers: getAuthHeaders() });
        toast.success('Customer saved successfully.');
        setCustomerForm(getInitialCustomerForm());
        fetchCustomers();
      } catch (err) {
        console.warn('AddCustomer API:', err?.response?.data || err.message);
        const msg = err?.response?.data?.Message || err?.response?.data?.message;
        if (msg) toast.error(String(msg));
        else toast.info('Could not save customer. Confirm AddCustomer API path and field names with your backend.');
      } finally {
        setCustomerSubmitting(false);
      }
    },
    [customerForm, clientCode, fetchCustomers]
  );

  const fetchDailyRates = useCallback(async () => {
    if (!clientCode) return;
    setRatesLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/ProductMaster/GetAllDailyRate`,
        { ClientCode: clientCode },
        { headers: getAuthHeaders() }
      );
      const raw = res?.data;
      const rows =
        Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.Result) ? raw.Result : [];

      setDailyRatesRows(rows);

      // Initialize rates for all purities (blank for missing rows).
      const nextRates = {};
      const nextInitial = {};
      (dropdownData.purities || []).forEach((p) => {
        const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
        if (!pId) return;
        nextRates[String(pId)] = '';
        nextInitial[String(pId)] = '';
      });

      rows.forEach((r) => {
        const pId = r.PurityId ?? r.purityId ?? r.Id ?? r.id ?? r.PurityID ?? '';
        if (!pId) return;
        const rate = r.Rate ?? '';
        const num = typeof rate === 'number' ? rate : Number(rate);
        const cleaned = rate === '' || rate == null || Number.isNaN(num) ? '' : String(Math.round(num));
        nextRates[String(pId)] = cleaned;
        nextInitial[String(pId)] = cleaned;
      });

      setRatesByPurityId(nextRates);
      setInitialRatesByPurityId(nextInitial);
    } catch (e) {
      console.error('Error fetching daily rates:', e);
      toast.error(e?.response?.data?.Message || 'Failed to load daily rates');
      setDailyRatesRows([]);
      setRatesByPurityId({});
      setInitialRatesByPurityId({});
    } finally {
      setRatesLoading(false);
    }
  }, [clientCode, dropdownData.purities]);

  const getCategoryNameById = useCallback((categoryId) => {
    const id = String(categoryId ?? '');
    if (!id) return '';
    return (dropdownData.categories || []).find((c) => String(c.Id ?? c.id ?? c.CategoryId ?? '') === id)?.CategoryName
      ?? (dropdownData.categories || []).find((c) => String(c.Id ?? c.id ?? c.CategoryId ?? '') === id)?.Name
      ?? '';
  }, [dropdownData.categories]);

  const handleDailyRateChange = useCallback((row, nextValue) => {
    const normalized = nextValue == null ? '' : String(nextValue).trim();
    const purityId = row.Id ?? row.id ?? row.PurityId ?? row.PurityID ?? '';
    const categoryId = row.CategoryId ?? row.categoryId ?? '';

    if (!purityId || categoryId === '' || categoryId == null) return;

    const catKey = String(categoryId);
    const purityKey = String(purityId);

    const categoryPurities = (dropdownData.purities || [])
      .filter((p) => String(p.CategoryId ?? p.categoryId ?? '') === catKey);

    if (categoryPurities.length === 0) return;

    if (normalized === '') {
      // Clear all rows for this category.
      setRatesByPurityId((prev) => {
        const next = { ...prev };
        categoryPurities.forEach((p) => {
          const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
          if (!pId) return;
          next[String(pId)] = '';
        });
        return next;
      });
      return;
    }

    const inputRate = Number(normalized);
    if (Number.isNaN(inputRate)) return;

    const getFinePct = (p) => Number(p?.FinePercentage ?? p?.FinePercent ?? 0) || 0;
    const base24 = categoryPurities.find((p) => String(p?.PurityName ?? p?.Name ?? '').trim().toUpperCase() === '24CT');
    const baseRow = base24
      ? base24
      : categoryPurities.slice().sort((a, b) => getFinePct(b) - getFinePct(a))[0];

    const basePurityId = baseRow ? (baseRow.Id ?? baseRow.id ?? baseRow.PurityId ?? baseRow.PurityID ?? '') : '';
    const baseFine = baseRow ? getFinePct(baseRow) : 0;

    const editedRow = categoryPurities.find((p) => {
      const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
      return pId !== '' && String(pId) === purityKey;
    });
    const editedFine = editedRow ? getFinePct(editedRow) : 0;

    // If Fine% is missing, just set typed row.
    if (!baseFine || baseFine <= 0 || !basePurityId) {
      setRatesByPurityId((prev) => ({ ...prev, [purityKey]: String(Math.round(inputRate)) }));
      return;
    }

    const baseRateNum =
      purityKey === String(basePurityId)
        ? inputRate
        : (editedFine > 0 ? inputRate * (baseFine / editedFine) : inputRate);

    setRatesByPurityId((prev) => {
      const next = { ...prev };
      categoryPurities.forEach((p) => {
        const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
        if (!pId) return;
        const finePct = getFinePct(p);
        const computedRate = baseRateNum * (finePct / baseFine);
        next[String(pId)] = String(Math.round(computedRate));
      });
      return next;
    });
  }, [dropdownData.categories, dropdownData.purities]);

  const handleSetRatesAdmin = useCallback(async () => {
    const client = clientCode;
    if (!client) {
      toast.error('Client code not found');
      return;
    }
    if (!dropdownData.purities?.length) {
      toast.info('Purities not loaded');
      return;
    }

    // Only send changed rows.
    const payload = (dropdownData.purities || [])
      .map((p) => {
        const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
        if (!pId) return null;
        const key = String(pId);
        const cur = String(ratesByPurityId[key] ?? '');
        const initial = String(initialRatesByPurityId[key] ?? '');
        if (cur === initial) return null;

        const catId = p.CategoryId ?? p.categoryId ?? '';
        const catKey = catId !== '' && catId != null ? String(catId) : '';

        return {
          CategoryId: catKey,
          EmployeeCode: client,
          Rate: cur === '' ? '' : cur,
          PurityId: key,
          ClientCode: client,
          CategoryName: getCategoryNameById(catKey),
          PurityName: p.PurityName ?? p.Name ?? '',
          FinePercentage: p.FinePercentage ?? p.FinePercent ?? '',
        };
      })
      .filter(Boolean);

    if (payload.length === 0) {
      toast.info('No rate changes to save');
      return;
    }

    setRatesSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/ProductMaster/UpdateDailyRates`,
        payload,
        { headers: getAuthHeaders() }
      );
      const data = res?.data ?? {};
      const ok =
        data?.status === 'success' ||
        data?.success === true ||
        (res.status === 200 && data?.status !== 'failed');

      if (!ok) {
        const msg = data?.message ?? data?.Message ?? data?.error ?? 'UpdateDailyRates failed';
        throw new Error(typeof msg === 'string' ? msg : 'Update failed');
      }

      toast.success('Daily rates updated successfully');
      await fetchDailyRates();
    } catch (e) {
      console.error('UpdateDailyRates error:', e);
      const msg = e?.response?.data?.Message || e?.response?.data?.message || e?.message || 'Failed to update daily rates';
      toast.error(msg);
    } finally {
      setRatesSaving(false);
    }
  }, [clientCode, dropdownData.purities, getCategoryNameById, fetchDailyRates, initialRatesByPurityId, ratesByPurityId]);

  const fetchDropdownData = useCallback(() => {
    if (!clientCode) return;
    const body = { ClientCode: clientCode };
    const headers = getAuthHeaders();
    Promise.all([
      axios.post(`${API_BASE}/api/ProductMaster/GetAllCategory`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllProductMaster`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllDesign`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllPurity`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ClientOnboarding/GetAllBranchMaster`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ClientOnboarding/GetAllCounters`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllBoxMaster`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      axios.post(`${API_BASE}/api/ProductMaster/GetAllPacketMaster`, body, { headers }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
    ]).then(([categories, products, designs, purities, branches, counters, boxes, packets]) => {
      setDropdownData({
        categories: Array.isArray(categories) ? categories : [],
        products: Array.isArray(products) ? products : [],
        designs: Array.isArray(designs) ? designs : [],
        purities: Array.isArray(purities) ? purities : [],
        branches: Array.isArray(branches) ? branches : [],
        counters: Array.isArray(counters) ? counters : [],
        boxes: Array.isArray(boxes) ? boxes : [],
        packets: Array.isArray(packets) ? packets : [],
      });
    });
  }, [clientCode]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    const initialForm = {};
    if (activeOption === 'box') {
      initialForm.status = 'Active';
    }
    setFormData(initialForm);
    setBoxPackets([]);
    setListSearch('');
    setListPage(1);
    setEditingId(null);
    setDeleteConfirm(null);
    setBoxRfidTagMode('reuse');
    setBoxRfidLookupError('');
    setBoxRfidLookupLoading(false);
  }, [activeOption]);

  useEffect(() => {
    if (activeOption === 'rates') {
      fetchDailyRates();
    }
  }, [activeOption, fetchDailyRates]);

  const fetchBoxTidForRfid = useCallback(async (rfidValue) => {
    const barcode = String(rfidValue || '').trim();
    if (!barcode || barcode.length <= 4) {
      setBoxRfidLookupError('');
      return;
    }
    if (!clientCode) {
      setBoxRfidLookupError('Client code not found.');
      return;
    }

    setBoxRfidLookupLoading(true);
    setBoxRfidLookupError('');
    try {
      const res = await rfidService.getTidByBarcode(clientCode, barcode);
      const tid = parseTidFromBarcodeResponse(res);
      if (!tid) {
        setBoxRfidLookupError('No TID found for this RFID number.');
        setFormData((prev) => ({ ...prev, hexCode: '', tidNumber: '' }));
        return;
      }
      const tidUpper = tid.toUpperCase();
      setFormData((prev) => ({
        ...prev,
        rfidCode: barcode.toUpperCase(),
        hexCode: tidUpper,
        tidNumber: tidUpper,
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'TID lookup failed.';
      setBoxRfidLookupError(msg);
      setFormData((prev) => ({ ...prev, hexCode: '', tidNumber: '' }));
    } finally {
      setBoxRfidLookupLoading(false);
    }
  }, [clientCode]);

  const scheduleBoxTidLookup = useCallback((rfidValue) => {
    if (boxRfidLookupTimerRef.current) clearTimeout(boxRfidLookupTimerRef.current);
    boxRfidLookupTimerRef.current = setTimeout(() => {
      fetchBoxTidForRfid(rfidValue);
    }, 350);
  }, [fetchBoxTidForRfid]);

  useEffect(() => () => {
    if (boxRfidLookupTimerRef.current) clearTimeout(boxRfidLookupTimerRef.current);
  }, []);

  const handleBoxRfidModeChange = (mode) => {
    setBoxRfidTagMode(mode);
    setBoxRfidLookupError('');
    setBoxRfidLookupLoading(false);
    setFormData((prev) => ({ ...prev, rfidCode: '', hexCode: '', tidNumber: '' }));
  };

  const updateField = (key, value) => {
    if (activeOption === 'box' && key === 'rfidCode' && boxRfidTagMode === 'reuse') {
      const rfid = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      setFormData((prev) => ({
        ...prev,
        rfidCode: rfid,
        ...(rfid.length <= 4 ? { hexCode: '', tidNumber: '' } : {}),
      }));
      if (rfid.length > 4) {
        scheduleBoxTidLookup(rfid);
      } else {
        setBoxRfidLookupError('');
      }
      return;
    }

    if (activeOption === 'box' && key === 'rfidCode' && boxRfidTagMode === 'singleUse') {
      const rfid = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const hex = rfid ? rfidTextToHex(rfid) : '';
      setFormData((prev) => {
        const tidWasSynced = !String(prev.tidNumber || '').trim() || prev.tidNumber === prev.hexCode;
        return {
          ...prev,
          rfidCode: rfid,
          hexCode: hex,
          tidNumber: tidWasSynced ? hex : prev.tidNumber,
        };
      });
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (activeOption === 'box') {
        if (key === 'hexCode') {
          const hex = String(value || '').trim().toUpperCase();
          next.hexCode = hex;
          if (!String(prev.tidNumber || '').trim() || prev.tidNumber === prev.hexCode) {
            next.tidNumber = hex;
          }
        }
        if (key === 'rfidCode') {
          next.rfidCode = String(value || '').trim().toUpperCase();
        }
      }
      return next;
    });
  };

  const getFieldConfig = () => {
    const cats = { options: dropdownData.categories, optionLabel: 'CategoryName', optionValue: 'Id' };
    const prods = { options: dropdownData.products, optionLabel: 'ProductName', optionValue: 'Id' };
    const placeholder = (t) => ({ placeholder: t });
    switch (activeOption) {
      case 'category':
        return [
          { key: 'name', label: 'Category Name', type: 'text', required: true, ...placeholder('Enter category name'), colSpan: 1 },
          { key: 'shortName', label: 'Short Name', type: 'text', required: true, ...placeholder('Enter short name'), colSpan: 1 },
          { key: 'slug', label: 'Slug', type: 'text', required: false, ...placeholder('Enter slug'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'parentCategoryId', label: 'Parent Category', type: 'select', required: false, placeholder: 'Select an option', options: dropdownData.categories, optionLabel: 'CategoryName', optionValue: 'Id', colSpan: 1 },
          { key: 'hsnCode', label: 'HSN Code', type: 'text', required: false, ...placeholder('Enter HSN code'), colSpan: 1 },
          { key: 'status', label: 'Status', type: 'select', required: false, placeholder: 'Select', options: STATUS_OPTIONS, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
        ];
      case 'product':
        return [
          { key: 'categoryId', label: 'Category', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'productName', label: 'Product Name', type: 'text', required: true, ...placeholder('Enter product name'), colSpan: 1 },
          { key: 'shortName', label: 'Short Name', type: 'text', required: true, ...placeholder('Enter short name'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'slug', label: 'Slug', type: 'text', required: false, ...placeholder('Enter slug'), colSpan: 1 },
          { key: 'status', label: 'Status', type: 'select', required: false, placeholder: 'Select', options: STATUS_OPTIONS, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
        ];
      case 'design':
        return [
          { key: 'categoryId', label: 'Category Name', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'productId', label: 'Product Name', type: 'select', required: true, placeholder: 'Select an option', ...prods, colSpan: 1 },
          { key: 'designName', label: 'Design Name', type: 'text', required: true, ...placeholder('Enter design name'), colSpan: 1 },
          { key: 'branchId', label: 'Branch', type: 'select', required: false, placeholder: 'Select an option', options: dropdownData.branches, optionLabel: 'BranchName', optionValue: 'Id', colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'slug', label: 'Slug', type: 'text', required: false, ...placeholder('Enter slug'), colSpan: 1 },
          { key: 'labelCode', label: 'Label Code', type: 'text', required: true, placeholder: 'Only Capitals', colSpan: 1 },
          { key: 'status', label: 'Status', type: 'select', required: false, placeholder: 'Select', options: STATUS_OPTIONS, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
          { key: 'minQuantity', label: 'Min Quantity', type: 'text', required: false, ...placeholder('0'), colSpan: 1 },
          { key: 'minWeight', label: 'Min Weight', type: 'text', required: false, ...placeholder('0'), colSpan: 1 },
        ];
      case 'purity':
        return [
          { key: 'categoryId', label: 'Category', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'purityName', label: 'Purity Name', type: 'text', required: true, ...placeholder('Enter purity name'), colSpan: 1 },
          { key: 'shortName', label: 'Short Name', type: 'text', required: true, ...placeholder('Enter short name'), colSpan: 1 },
          { key: 'finePercentage', label: 'Fine Percentage', type: 'text', required: true, ...placeholder('Enter fine %'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'todaysRate', label: "Today's Rate", type: 'text', required: false, ...placeholder("Enter today's rate"), colSpan: 1 },
          { key: 'status', label: 'Status', type: 'select', required: false, placeholder: 'Select', options: STATUS_OPTIONS, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
        ];
      case 'counter':
        return [
          { key: 'name', label: 'Counter Name', type: 'text', required: true, ...placeholder('Enter counter name'), colSpan: 1 },
          { key: 'counterDescription', label: 'Counter Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'branchId', label: 'Branch ID', type: 'select', options: dropdownData.branches, optionLabel: 'BranchName', optionValue: 'Id', required: true, placeholder: 'Select an option', colSpan: 1 },
          { key: 'counterNumber', label: 'Counter Number', type: 'text', required: true, ...placeholder('Enter counter number'), colSpan: 1 },
          { key: 'financialYear', label: 'Financial Year', type: 'text', required: false, ...placeholder('Financial year'), colSpan: 1 },
        ];
      case 'box':
        return [
          { key: 'name', label: 'Box Name', type: 'text', required: true, ...placeholder('Enter box name'), colSpan: 1 },
          { key: 'categoryId', label: 'Category', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'productId', label: 'Product', type: 'select', required: true, placeholder: 'Select an option', ...prods, colSpan: 1 },
          { key: 'branchId', label: 'Branch', type: 'select', required: false, placeholder: 'Select an option', options: dropdownData.branches, optionLabel: 'BranchName', optionValue: 'Id', colSpan: 1 },
          { key: 'emptyWeight', label: 'Empty Weight', type: 'text', required: true, ...placeholder('Enter empty weight'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'status', label: 'Status', type: 'select', required: true, placeholder: 'Select an option', options: STATUS_OPTIONS, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
          { key: 'packetIds', label: 'Packet IDs', type: 'text', required: false, ...placeholder('e.g. 1 or 1,2,3'), colSpan: 1 },
          { key: 'rfidCode', label: 'Box RFID Code', type: 'text', required: false, ...placeholder('e.g. BOXEPC001'), colSpan: 1 },
          { key: 'hexCode', label: 'Hex Code', type: 'text', required: false, ...placeholder('e.g. 424F584145'), colSpan: 1 },
          { key: 'tidNumber', label: 'TID Number', type: 'text', required: false, ...placeholder('Defaults to hex code'), colSpan: 1 },
          { key: 'employeeCode', label: 'Employee Code', type: 'text', required: false, ...placeholder('e.g. EMP01'), colSpan: 1 },
        ];
      case 'packet':
        return [
          { key: 'categoryId', label: 'Category', type: 'select', required: true, placeholder: 'Select an option', ...cats, colSpan: 1 },
          { key: 'designId', label: 'Design', type: 'select', required: false, placeholder: 'Select an option', options: dropdownData.designs, optionLabel: 'DesignName', optionValue: 'Id', colSpan: 1 },
          { key: 'packetName', label: 'Packet Name', type: 'text', required: true, ...placeholder('Enter packet name'), colSpan: 1 },
          { key: 'description', label: 'Description', type: 'text', required: false, ...placeholder('Enter description'), colSpan: 1 },
          { key: 'boxId', label: 'Box', type: 'select', required: false, placeholder: 'Select an option', options: dropdownData.boxes, optionLabel: 'BoxName', optionValue: 'Id', colSpan: 1 },
          { key: 'branchId', label: 'Branch', type: 'select', required: true, placeholder: 'Select an option', options: dropdownData.branches, optionLabel: 'BranchName', optionValue: 'Id', colSpan: 1 },
          { key: 'productId', label: 'Product', type: 'select', required: true, placeholder: 'Select an option', ...prods, colSpan: 1 },
          { key: 'sku', label: 'SKU', type: 'text', required: false, ...placeholder('SKU'), colSpan: 1 },
          { key: 'emptyWeight', label: 'Empty Weight', type: 'text', required: true, ...placeholder('Enter empty weight'), colSpan: 1 },
          { key: 'status', label: 'Status', type: 'select', required: true, placeholder: 'Select an option', options: STATUS_OPTIONS, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
        ];
      case 'branch':
        return [
          { key: 'code', label: 'Branch Code', type: 'text', required: false, ...placeholder('Branch code'), colSpan: 1 },
          { key: 'name', label: 'Branch Name', type: 'text', required: true, ...placeholder('Enter branch name'), colSpan: 1 },
          { key: 'branchHead', label: 'Branch Head', type: 'text', required: false, ...placeholder('Branch head'), colSpan: 1 },
          { key: 'phoneNumber', label: 'Phone Number', type: 'text', required: false, ...placeholder('Phone'), colSpan: 1 },
          { key: 'faxNumber', label: 'Fax Number', type: 'text', required: false, ...placeholder('Fax'), colSpan: 1 },
          { key: 'area', label: 'Area', type: 'text', required: false, ...placeholder('Area'), colSpan: 1 },
          { key: 'city', label: 'City', type: 'text', required: false, ...placeholder('City'), colSpan: 1 },
          { key: 'state', label: 'State', type: 'select', required: true, placeholder: 'Select an option', options: [{ id: '', name: 'Select state' }, ...['Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana'].map(s => ({ id: s, name: s }))], optionLabel: 'name', optionValue: 'id', colSpan: 1 },
          { key: 'gstin', label: 'GSTIN', type: 'text', required: false, ...placeholder('GSTIN'), colSpan: 1 },
          { key: 'financialYear', label: 'Financial Year', type: 'text', required: false, ...placeholder('Financial year'), colSpan: 1 },
          { key: 'branchType', label: 'Branch Type', type: 'select', required: true, placeholder: 'Select an option', options: BRANCH_TYPES, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
          { key: 'address', label: 'Branch Address', type: 'textarea', required: false, ...placeholder('Address'), colSpan: 1 },
          { key: 'mobileNumber', label: 'Mobile Number', type: 'text', required: false, ...placeholder('Mobile'), colSpan: 1 },
          { key: 'street', label: 'Street', type: 'text', required: false, ...placeholder('Street'), colSpan: 1 },
          { key: 'town', label: 'Town', type: 'text', required: false, ...placeholder('Town'), colSpan: 1 },
          { key: 'country', label: 'Country', type: 'select', required: true, placeholder: 'Select an option', options: COUNTRY_OPTIONS, optionLabel: 'name', optionValue: 'id', colSpan: 1 },
          { key: 'postalCode', label: 'Postal Code', type: 'text', required: false, ...placeholder('Postal code'), colSpan: 1 },
          { key: 'branchEmail', label: 'Branch Email ID', type: 'text', required: false, ...placeholder('Email'), colSpan: 1 },
        ];
      default:
        return [{ key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Enter name', colSpan: 1 }];
    }
  };

  const LIST_PLURAL = {
    category: 'Categories',
    product: 'Products',
    design: 'Designs',
    purity: 'Purities',
    counter: 'Counters',
    box: 'Boxes',
    packet: 'Packets',
    branch: 'Branches',
  };
  const LIST_DATA_KEYS = {
    category: 'categories',
    product: 'products',
    design: 'designs',
    purity: 'purities',
    counter: 'counters',
    box: 'boxes',
    packet: 'packets',
    branch: 'branches',
  };

  const getListColumns = () => {
    const cols = (arr) => arr.filter(Boolean);
    const srNo = { key: 'srNo', label: 'Sr. No.', width: '64px' };
    switch (activeOption) {
      case 'category':
        return cols([
          srNo,
          { key: 'CategoryName', label: 'Category Name' },
          { key: 'ShortName', label: 'Short Name', width: '90px' },
          { key: 'Slug', label: 'Slug', width: '100px' },
          { key: 'HSNCode', label: 'HSN Code', width: '80px' },
          { key: 'Status', label: 'Status', width: '70px' },
        ]);
      case 'product':
        return cols([
          srNo,
          { key: 'ProductName', label: 'Product Name' },
          { key: 'ShortName', label: 'Short Name', width: '90px' },
          { key: 'CategoryName', label: 'Category', width: '100px' },
          { key: 'Status', label: 'Status', width: '70px' },
        ]);
      case 'design':
        return cols([
          srNo,
          { key: 'DesignName', label: 'Design Name' },
          { key: 'LabelCode', label: 'Label Code', width: '90px' },
          { key: 'CategoryName', label: 'Category', width: '90px' },
          { key: 'ProductName', label: 'Product', width: '90px' },
          { key: 'Status', label: 'Status', width: '70px' },
        ]);
      case 'purity':
        return cols([
          srNo,
          { key: 'PurityName', label: 'Purity Name' },
          { key: 'ShortName', label: 'Short Name', width: '90px' },
          { key: 'FinePercentage', label: 'Fine %', width: '70px' },
          { key: 'Status', label: 'Status', width: '70px' },
        ]);
      case 'counter':
        return cols([
          srNo,
          { key: 'CounterName', label: 'Counter Name' },
          { key: 'CounterNumber', label: 'Counter No', width: '90px' },
          { key: 'BranchName', label: 'Branch', width: '100px' },
          { key: 'CounterDescription', label: 'Description' },
        ]);
      case 'box':
        return cols([
          srNo,
          { key: 'BoxName', label: 'Box Name' },
          { key: 'CategoryName', label: 'Category', width: '90px' },
          { key: 'ProductName', label: 'Product', width: '90px' },
          { key: 'EmptyWeight', label: 'Empty Wt', width: '80px' },
          { key: 'RFIDCode', label: 'RFID', width: '90px' },
          { key: 'HexCode', label: 'Hex', width: '90px' },
          { key: 'IsRfidTagged', label: 'Tagged', width: '70px' },
          { key: 'Status', label: 'Status', width: '70px' },
        ]);
      case 'packet':
        return cols([
          srNo,
          { key: 'PacketName', label: 'Packet Name' },
          { key: 'CategoryName', label: 'Category', width: '90px' },
          { key: 'ProductName', label: 'Product', width: '90px' },
          { key: 'Status', label: 'Status', width: '70px' },
        ]);
      case 'branch':
        return cols([
          srNo,
          { key: 'BranchName', label: 'Branch Name' },
          { key: 'Name', label: 'Name' },
          { key: 'Code', label: 'Code', width: '80px' },
          { key: 'City', label: 'City', width: '90px' },
          { key: 'State', label: 'State', width: '90px' },
          { key: 'BranchType', label: 'Type', width: '70px' },
        ]);
      default:
        return [srNo, { key: 'Name', label: 'Name' }];
    }
  };

  const listDataKey = LIST_DATA_KEYS[activeOption] || 'categories';
  const rawList = useMemo(() => {
    const arr = dropdownData[listDataKey] || [];
    return [...arr].sort((a, b) => (Number(b?.Id ?? b?.id) || 0) - (Number(a?.Id ?? a?.id) || 0));
  }, [dropdownData, listDataKey]);
  const listColumns = useMemo(() => getListColumns(), [activeOption]);

  const getCellDisplay = (row, colKey) => {
    if (colKey === 'IsRfidTagged') {
      const tagged =
        row?.IsRfidTagged === true ||
        row?.isRfidTagged === true ||
        String(row?.IsRfidTagged).toLowerCase() === 'true' ||
        Boolean(
          String(row?.RFIDCode ?? row?.rfidCode ?? '').trim() ||
            String(row?.HexCode ?? row?.hexCode ?? '').trim()
        );
      return tagged ? 'Tagged' : 'Not tagged';
    }
    const fallbacks = {
      PacketName: 'Name',
      BranchName: 'Name',
      BoxName: 'Name',
      CounterName: 'Name',
      CounterDescription: 'Description',
      RFIDCode: 'rfidCode',
      HexCode: 'hexCode',
    };
    let v = row[colKey];
    if ((v === null || v === undefined) && fallbacks[colKey]) v = row[fallbacks[colKey]];
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).trim() || '—';
  };

  const filteredList = useMemo(() => {
    if (!listSearch.trim()) return rawList;
    const q = listSearch.trim().toLowerCase();
    return rawList.filter((row) =>
      listColumns.some((col) => {
        if (col.key === 'srNo') return false;
        const val = getCellDisplay(row, col.key);
        return val !== '—' && val.toLowerCase().includes(q);
      })
    );
  }, [rawList, listSearch, listColumns]);

  const totalListPages = Math.max(1, Math.ceil(filteredList.length / listPageSize));
  const safeListPage = Math.min(listPage, totalListPages) || 1;
  const paginatedList = useMemo(() => {
    const start = (safeListPage - 1) * listPageSize;
    return filteredList.slice(start, start + listPageSize);
  }, [filteredList, safeListPage, listPageSize]);

  useEffect(() => {
    if (listPage > totalListPages && totalListPages >= 1) setListPage(1);
  }, [listPage, totalListPages]);

  const getEndpoint = () => {
    const base = API_BASE;
    const soni = API_BASE_SONI;
    const map = {
      category: `${base}/api/ProductMaster/AddCategoryMaster`,
      product: `${base}/api/ProductMaster/AddProductMaster`,
      design: `${base}/api/ProductMaster/AddDesign`,
      purity: `${base}/api/ProductMaster/AddPurityMaster`,
      counter: `${soni}/api/ClientOnboarding/AddCounter`,
      box: `${base}/api/ProductMaster/AddBoxMaster`,
      packet: `${base}/api/ProductMaster/AddPacketMaster`,
      branch: `${soni}/api/ClientOnboarding/AddBranch`,
    };
    return map[activeOption] || map.category;
  };

  const getUpdateEndpoint = () => {
    const base = API_BASE;
    const soni = API_BASE_SONI;
    const map = {
      category: `${base}/api/ProductMaster/UpdateCategoryMaster`,
      product: `${base}/api/ProductMaster/UpdateProductMaster`,
      design: `${base}/api/ProductMaster/UpdateDesign`,
      purity: `${base}/api/ProductMaster/UpdatePurityMaster`,
      counter: `${soni}/api/ClientOnboarding/UpdateCounter`,
      box: `${base}/api/ProductMaster/UpdateBoxMaster`,
      packet: `${base}/api/ProductMaster/UpdatePacketMaster`,
      branch: `${soni}/api/ClientOnboarding/UpdateBranch`,
    };
    return map[activeOption] || map.category;
  };

  const getDeleteEndpoint = () => {
    const base = API_BASE;
    const soni = API_BASE_SONI;
    const map = {
      category: `${base}/api/ProductMaster/DeleteCategoryMaster`,
      product: `${base}/api/ProductMaster/DeleteProductMaster`,
      design: `${base}/api/ProductMaster/DeleteDesign`,
      purity: `${base}/api/ProductMaster/DeletePurityMaster`,
      counter: `${soni}/api/ClientOnboarding/DeleteCounter`,
      box: `${base}/api/ProductMaster/DeleteBoxMaster`,
      packet: `${base}/api/ProductMaster/DeletePacketMaster`,
      branch: `${soni}/api/ClientOnboarding/DeleteBranch`,
    };
    return map[activeOption] || map.category;
  };

  const rowToFormData = useCallback((row, option) => {
    const id = row.Id ?? row.id;
    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '');
    switch (option) {
      case 'category':
        return {
          name: row.CategoryName ?? row.Name ?? '',
          shortName: row.ShortName ?? '',
          slug: row.Slug ?? '',
          description: row.Description ?? '',
          parentCategoryId: row.ParentCategoryId ?? row.parentCategoryId ?? '',
          hsnCode: row.HSNCode ?? '',
          status: row.Status ?? 'Active',
          _id: id,
        };
      case 'product':
        return {
          categoryId: row.CategoryId ?? row.categoryId ?? '',
          productName: row.ProductName ?? row.Name ?? '',
          shortName: row.ShortName ?? '',
          description: row.Description ?? '',
          slug: row.Slug ?? '',
          status: row.Status ?? 'Active',
          _id: id,
        };
      case 'design':
        return {
          categoryId: row.CategoryId ?? row.categoryId ?? '',
          productId: row.ProductId ?? row.productId ?? '',
          designName: row.DesignName ?? row.Name ?? '',
          branchId: row.BranchId ?? row.branchId ?? '',
          description: row.Description ?? '',
          slug: row.Slug ?? '',
          labelCode: row.LabelCode ?? '',
          status: row.Status ?? 'Active',
          minQuantity: row.MinQuantity ?? '0',
          minWeight: row.MinWeight ?? '0',
          _id: id,
        };
      case 'purity':
        return {
          categoryId: row.CategoryId ?? row.categoryId ?? '',
          purityName: row.PurityName ?? row.Name ?? '',
          shortName: row.ShortName ?? '',
          finePercentage: row.FinePercentage ?? '',
          description: row.Description ?? '',
          todaysRate: row.TodaysRate ?? '',
          status: row.Status ?? 'Active',
          _id: id,
        };
      case 'counter':
        return {
          name: row.CounterName ?? row.Name ?? '',
          counterDescription: row.CounterDescription ?? row.Description ?? '',
          branchId: row.BranchId ?? row.branchId ?? '',
          counterNumber: row.CounterNumber ?? '',
          financialYear: row.FinancialYear ?? '',
          _id: id,
        };
      case 'box':
        return {
          categoryId: row.CategoryId ?? row.categoryId ?? '',
          name: row.BoxName ?? row.Name ?? '',
          description: row.Description ?? '',
          branchId: row.BranchId ?? row.branchId ?? '',
          productId: row.ProductId ?? row.productId ?? '',
          emptyWeight: row.EmptyWeight ?? row.emptyWeight ?? '',
          status: row.Status ?? row.status ?? 'Active',
          packetIds: row.PacketIds ?? row.packetIds ?? '',
          rfidCode: row.RFIDCode ?? row.rfidCode ?? '',
          hexCode: row.HexCode ?? row.hexCode ?? '',
          tidNumber: row.TIDNumber ?? row.tidNumber ?? '',
          employeeCode: row.EmployeeCode ?? row.employeeCode ?? '',
          _id: id,
        };
      case 'packet':
        return {
          categoryId: row.CategoryId ?? row.categoryId ?? '',
          designId: row.DesignId ?? row.designId ?? '',
          packetName: row.PacketName ?? row.Name ?? '',
          description: row.Description ?? '',
          boxId: row.BoxId ?? row.boxId ?? '',
          branchId: row.BranchId ?? row.branchId ?? '',
          productId: row.ProductId ?? row.productId ?? '',
          sku: row.SKU ?? row.sku ?? '',
          emptyWeight: row.EmptyWeight ?? '',
          status: row.Status ?? 'Active',
          _id: id,
        };
      case 'branch':
        return {
          code: row.Code ?? '',
          name: row.BranchName ?? row.Name ?? '',
          branchHead: row.BranchHead ?? '',
          phoneNumber: row.PhoneNumber ?? '',
          faxNumber: row.FaxNumber ?? '',
          area: row.Area ?? '',
          city: row.City ?? '',
          state: row.State ?? '',
          gstin: row.GSTIN ?? '',
          financialYear: row.FinancialYear ?? '',
          branchType: row.BranchType ?? '',
          address: row.Address ?? '',
          mobileNumber: row.MobileNumber ?? '',
          street: row.Street ?? '',
          town: row.Town ?? '',
          country: row.Country ?? 'India',
          postalCode: row.PostalCode ?? '',
          branchEmail: row.BranchEmailId ?? row.branchEmail ?? '',
          _id: id,
        };
      default:
        return { name: row.Name ?? '', _id: id };
    }
  }, [clientCode]);

  const buildPayload = () => {
    const payload = { ClientCode: clientCode };
    if (editingId != null) payload.Id = editingId;
    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
    const num = (v) => (v != null && v !== '' ? Number(v) : undefined);
    if (activeOption === 'category') {
      payload.CategoryName = str(formData.name) || '';
      payload.Description = str(formData.description) || '';
      payload.ShortName = str(formData.shortName) || '';
      const parentCat = formData.parentCategoryId != null && formData.parentCategoryId !== ''
        ? dropdownData.categories.find(c => String(c.Id) === String(formData.parentCategoryId))
        : null;
      payload.ParentCategory = parentCat ? (parentCat.CategoryName || parentCat.Name || '') : '';
      payload.Slug = str(formData.slug) || '';
      payload.Status = str(formData.status) || 'Active';
      payload.HSNCode = str(formData.hsnCode) || '';
      return payload;
    }
    if (activeOption === 'product') {
      payload.CategoryId = formData.categoryId != null && formData.categoryId !== '' ? String(formData.categoryId) : '';
      payload.ProductName = str(formData.productName) || '';
      payload.StoneName = str(formData.stoneName) ?? payload.ProductName;
      payload.ShortName = str(formData.shortName) || '';
      payload.Description = str(formData.description) || '';
      payload.Slug = str(formData.slug) || '';
      payload.Status = str(formData.status) || 'Active';
      payload.Shape = str(formData.shape) || '';
      payload.ShapeName = str(formData.shapeName) || '';
      payload.Clarity = str(formData.clarity) || '';
      payload.ClarityName = str(formData.clarityName) || '';
      payload.Color = str(formData.color) || '';
      payload.ColorName = str(formData.colorName) || '';
      payload.StoneWeightType = str(formData.stoneWeightType) || 'Gram';
      payload.StonePieces = num(formData.stonePieces) !== undefined ? num(formData.stonePieces) : 1;
      payload.StoneWeight = str(formData.stoneWeight) || '';
      payload.StoneRate = str(formData.stoneRate) || '';
      payload.StoneRatePerPiece = str(formData.stoneRatePerPiece) || '';
      payload.StoneShape = num(formData.stoneShape) !== undefined ? num(formData.stoneShape) : 0;
      payload.StoneColour = num(formData.stoneColour) !== undefined ? num(formData.stoneColour) : 0;
      payload.StoneSize = num(formData.stoneSize) !== undefined ? num(formData.stoneSize) : 0;
      payload.StoneSettingType = num(formData.stoneSettingType) !== undefined ? num(formData.stoneSettingType) : 0;
      payload.StoneStatusType = num(formData.stoneStatusType) !== undefined ? num(formData.stoneStatusType) : 0;
      return payload;
    }
    if (activeOption === 'design') {
      payload.CategoryId = formData.categoryId != null && formData.categoryId !== '' ? String(formData.categoryId) : '';
      payload.ProductId = formData.productId != null && formData.productId !== '' ? String(formData.productId) : '';
      payload.DesignName = str(formData.designName) || '';
      payload.BranchId = formData.branchId != null && formData.branchId !== '' ? Number(formData.branchId) : 0;
      payload.Description = str(formData.description) || '';
      payload.Slug = str(formData.slug) || '';
      payload.LabelCode = str(formData.labelCode) || '';
      payload.Status = str(formData.status) || 'Active';
      payload.MinQuantity = str(formData.minQuantity) ?? '0';
      payload.MinWeight = str(formData.minWeight) ?? '0';
      return payload;
    }
    if (activeOption === 'purity') {
      payload.PurityName = str(formData.purityName) || '';
      payload.CategoryId = formData.categoryId != null && formData.categoryId !== '' ? String(formData.categoryId) : '';
      payload.ShortName = str(formData.shortName) || '';
      payload.Description = str(formData.description) || '';
      payload.FinePercentage = str(formData.finePercentage) || '';
      payload.TodaysRate = str(formData.todaysRate) || '';
      payload.Status = str(formData.status) || 'Active';
      return payload;
    }
    if (activeOption === 'counter') {
      const counterName = str(formData.name);
      if (counterName) payload.CounterName = counterName;
      const branchId = toIntOrUndefined(formData.branchId);
      if (branchId !== undefined) payload.BranchId = branchId;
      const counterNumber = str(formData.counterNumber);
      if (counterNumber) payload.CounterNumber = counterNumber;
      const counterDescription = str(formData.counterDescription);
      if (counterDescription) payload.CounterDescription = counterDescription;
      const financialYear = str(formData.financialYear);
      if (financialYear) payload.FinancialYear = financialYear;
      payload.CompanyId = resolveCompanyId(dropdownData.branches);
      return payload;
    }
    if (activeOption === 'box') {
      const categoryId =
        toIntOrUndefined(formData.categoryId) ?? firstMasterId(dropdownData.categories);
      const productId =
        toIntOrUndefined(formData.productId) ?? firstMasterId(dropdownData.products);
      const branchId =
        toIntOrUndefined(formData.branchId) ?? firstMasterId(dropdownData.branches);
      if (categoryId !== undefined) payload.CategoryId = categoryId;
      const rfidCode = str(formData.rfidCode);
      const hexCode = str(formData.hexCode);
      payload.BoxName =
        str(formData.name) || rfidCode || hexCode || `Box-${Date.now()}`;
      payload.EmptyWeight = str(formData.emptyWeight) || '0';
      if (productId !== undefined) payload.ProductId = productId;
      payload.CompanyId = resolveCompanyId(dropdownData.branches);
      if (branchId !== undefined) payload.BranchId = branchId;
      payload.Description = str(formData.description) || '';
      payload.Status = str(formData.status) || 'Active';
      payload.PacketIds = str(formData.packetIds) || '';
      const tidNumber = str(formData.tidNumber) || hexCode;
      if (rfidCode) payload.RFIDCode = rfidCode.toUpperCase();
      if (hexCode) payload.HexCode = hexCode.toUpperCase();
      if (tidNumber) payload.TIDNumber = tidNumber.toUpperCase();
      if (str(formData.employeeCode)) payload.EmployeeCode = str(formData.employeeCode);
      return payload;
    }
    if (activeOption === 'packet') {
      if (str(formData.packetName)) payload.Name = str(formData.packetName);
      const packetCategoryId = toIntOrUndefined(formData.categoryId);
      const packetProductId = toIntOrUndefined(formData.productId);
      const packetDesignId = toIntOrUndefined(formData.designId);
      const packetBoxId = toIntOrUndefined(formData.boxId);
      const packetBranchId = toIntOrUndefined(formData.branchId);
      if (packetCategoryId !== undefined) payload.CategoryId = packetCategoryId;
      if (packetProductId !== undefined) payload.ProductId = packetProductId;
      if (packetDesignId !== undefined) payload.DesignId = packetDesignId;
      if (packetBoxId !== undefined) payload.BoxId = packetBoxId;
      if (packetBranchId !== undefined) payload.BranchId = packetBranchId;
      payload.CompanyId = resolveCompanyId(dropdownData.branches);
      if (str(formData.emptyWeight)) payload.EmptyWeight = str(formData.emptyWeight);
      if (str(formData.description)) payload.Description = str(formData.description);
      if (str(formData.sku)) payload.SKU = str(formData.sku);
      if (str(formData.status)) payload.Status = str(formData.status);
      return payload;
    }
    if (activeOption === 'branch') {
      if (str(formData.name)) payload.Name = str(formData.name);
      if (str(formData.code)) payload.Code = str(formData.code);
      if (str(formData.address)) payload.Address = str(formData.address);
      if (str(formData.branchHead)) payload.BranchHead = str(formData.branchHead);
      if (str(formData.phoneNumber)) payload.PhoneNumber = str(formData.phoneNumber);
      if (str(formData.faxNumber)) payload.FaxNumber = str(formData.faxNumber);
      if (str(formData.area)) payload.Area = str(formData.area);
      if (str(formData.city)) payload.City = str(formData.city);
      if (str(formData.state)) payload.State = str(formData.state);
      if (str(formData.gstin)) payload.GSTIN = str(formData.gstin);
      if (str(formData.financialYear)) payload.FinancialYear = str(formData.financialYear);
      payload.CompanyId = resolveCompanyId(dropdownData.branches);
      if (str(formData.branchType)) payload.BranchType = str(formData.branchType);
      if (str(formData.mobileNumber)) payload.MobileNumber = str(formData.mobileNumber);
      if (str(formData.street)) payload.Street = str(formData.street);
      if (str(formData.town)) payload.Town = str(formData.town);
      if (str(formData.country)) payload.Country = str(formData.country);
      if (str(formData.postalCode)) payload.PostalCode = str(formData.postalCode);
      if (str(formData.branchEmail)) payload.BranchEmailId = str(formData.branchEmail);
      return payload;
    }
    if (str(formData.name)) payload.Name = str(formData.name);
    if (str(formData.code)) payload.Code = str(formData.code);
    if (str(formData.shortName)) payload.ShortName = str(formData.shortName);
    if (str(formData.slug)) payload.Slug = str(formData.slug);
    if (str(formData.description)) payload.Description = str(formData.description);
    if (str(formData.address)) payload.Address = str(formData.address);
    if (formData.categoryId != null && formData.categoryId !== '') payload.CategoryId = formData.categoryId;
    if (formData.parentCategoryId != null && formData.parentCategoryId !== '') payload.ParentCategoryId = formData.parentCategoryId;
    if (str(formData.hsnCode)) payload.HSNCode = str(formData.hsnCode);
    if (formData.branchId != null && formData.branchId !== '') payload.BranchId = formData.branchId;
    return payload;
  };

  const handleResetForm = () => {
    setFormData({});
    setEditingId(null);
    setBoxRfidTagMode('reuse');
    setBoxRfidLookupError('');
    setBoxRfidLookupLoading(false);
  };
  const handleCancel = () => {
    setFormData({});
    setEditingId(null);
    setBoxRfidTagMode('reuse');
    setBoxRfidLookupError('');
    setBoxRfidLookupLoading(false);
  };

  const handleEdit = (row) => {
    const data = rowToFormData(row, activeOption);
    const { _id, ...rest } = data;
    setFormData(rest);
    setEditingId(_id ?? null);
    formCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteClick = (row) => setDeleteConfirm({
    row,
    masterLabel: ALL_NAV_OPTIONS.find((o) => o.id === activeOption)?.label ?? activeOption,
  });

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !clientCode) return;
    const id = deleteConfirm.row.Id ?? deleteConfirm.row.id;
    if (id == null) {
      toast.error('Cannot delete: no id.');
      setDeleteConfirm(null);
      return;
    }
    setDeletingId(id);
    try {
      const res = await axios.post(getDeleteEndpoint(), { ClientCode: clientCode, Id: id }, { headers: getAuthHeaders() });
      const data = res.data;
      const ok = data?.status === 'success' || data?.success === true || (res.status === 200 && data?.status !== 'failed');
      if (ok) {
        toast.success(data?.message ?? data?.Message ?? 'Deleted successfully.');
        fetchDropdownData();
        setDeleteConfirm(null);
      } else {
        toast.error(data?.message ?? data?.Message ?? data?.error ?? 'Delete failed.');
      }
    } catch (err) {
      const resData = err.response?.data;
      const msg = resData?.message ?? resData?.Message ?? resData?.error ?? err.message ?? 'Delete failed.';
      toast.error(typeof msg === 'string' ? msg : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const validateBoxRfidUniqueness = () => {
    const rfid = String(formData.rfidCode || '').trim().toUpperCase();
    const hex = String(formData.hexCode || '').trim().toUpperCase();
    if (!rfid && !hex) return null;
    const currentId = editingId != null ? String(editingId) : null;
    for (const box of dropdownData.boxes || []) {
      const boxId = String(box.Id ?? box.id ?? '');
      if (currentId && boxId === currentId) continue;
      const existingName = box.BoxName ?? box.boxName ?? box.Name ?? 'Box';
      const existingRfid = String(box.RFIDCode ?? box.rfidCode ?? '').trim().toUpperCase();
      const existingHex = String(box.HexCode ?? box.hexCode ?? '').trim().toUpperCase();
      if (rfid && existingRfid && rfid === existingRfid) {
        return `RFIDCode already used on Box: ${existingName}`;
      }
      if (hex && existingHex && hex === existingHex) {
        return `HexCode already used on Box: ${existingName}`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientCode) {
      toast.error('Client code not found. Please log in again.');
      return;
    }
    const requiredFields = getFieldConfig().filter(f => f.required);
    const missing = requiredFields.find(f => !formData[f.key]?.toString().trim());
    if (missing) {
      toast.warning(`${missing.label} is required.`);
      return;
    }
    if (activeOption === 'box') {
      const rfidConflict = validateBoxRfidUniqueness();
      if (rfidConflict) {
        toast.error(rfidConflict);
        return;
      }
    }
    const successMessages = {
      category: 'Category created successfully.',
      product: 'Product created successfully.',
      design: 'Design created successfully.',
      purity: 'Purity created successfully.',
      counter: 'Counter created successfully.',
      box: 'Box created successfully.',
      packet: 'Packet created successfully.',
      branch: 'Branch created successfully.',
    };
    setLoading(true);
    const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
    const boxRfidDraft =
      activeOption === 'box' && !editingId
        ? {
            rfidCode: str(formData.rfidCode),
            hexCode: str(formData.hexCode),
            tidNumber: str(formData.tidNumber) || str(formData.hexCode),
          }
        : null;
    try {
      const payload = buildPayload();
      const isEdit = editingId != null;
      const url = isEdit ? getUpdateEndpoint() : getEndpoint();
      const res = await axios.post(url, payload, { headers: getAuthHeaders() });
      const data = res.data;
      const serverMsg = data?.message ?? data?.Message ?? data?.msg ?? '';
      const serverErr = data?.error ?? data?.Error ?? data?.message ?? data?.Message ?? '';
      const ok =
        data?.status === 'success' ||
        data?.success === true ||
        (activeOption === 'box' && data?.id != null) ||
        (res.status === 200 && data?.status !== 'failed');
      if (ok) {
        let boxRfidTagged = activeOption === 'box' && data?.isRfidTagged;
        const newBoxId = data?.id ?? data?.Id;
        if (
          activeOption === 'box' &&
          !isEdit &&
          newBoxId != null &&
          boxRfidDraft &&
          (boxRfidDraft.rfidCode || boxRfidDraft.hexCode || boxRfidDraft.tidNumber)
        ) {
          try {
            const tagPayload = {
              ClientCode: clientCode,
              BoxId: parseInt(newBoxId, 10),
            };
            if (boxRfidDraft.rfidCode) tagPayload.RFIDCode = boxRfidDraft.rfidCode.toUpperCase();
            if (boxRfidDraft.hexCode) {
              tagPayload.HexCode = boxRfidDraft.hexCode.toUpperCase();
              tagPayload.TIDNumber = (boxRfidDraft.tidNumber || boxRfidDraft.hexCode).toUpperCase();
            } else if (boxRfidDraft.tidNumber) {
              tagPayload.TIDNumber = boxRfidDraft.tidNumber.toUpperCase();
            }
            const tagRes = await assignBoxRfidTag(tagPayload);
            if (tagRes?.success !== false) boxRfidTagged = true;
          } catch (tagErr) {
            toast.warning(
              tagErr?.response?.data?.message ||
                tagErr?.message ||
                'Box created but RFID tag could not be assigned. Use Assign Box RFID Tag later.'
            );
          }
        }
        const boxRfidNote = activeOption === 'box' && boxRfidTagged ? ' Box RFID tag saved.' : '';
        toast.success(
          serverMsg ||
            (isEdit ? 'Updated successfully.' : successMessages[activeOption] || 'Saved successfully.') + boxRfidNote
        );
        setFormData({});
        setEditingId(null);
        fetchDropdownData();
      } else {
        toast.error(serverErr || (isEdit ? 'Update failed.' : 'Create failed.'));
      }
    } catch (err) {
      const resData = err.response?.data;
      const msg = resData?.message ?? resData?.Message ?? resData?.error ?? resData?.Error ?? err.message ?? 'Request failed.';
      toast.error(typeof msg === 'string' ? msg : (resData?.message || 'Request failed.'));
    } finally {
      setLoading(false);
    }
  };

  const current = ALL_NAV_OPTIONS.find((o) => o.id === activeOption) || MASTER_OPTIONS[0];
  const CurrentIcon = current.icon;
  const fields = getFieldConfig();

  const baseStyles = {
    page: {
      minHeight: '100vh',
      height: '100%',
      background: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    topBar: {
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      borderBottom: '1px solid #e2e8f0',
      padding: '12px 20px',
      flexShrink: 0,
      boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
    },
    title: { margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' },
    subtitle: { margin: '2px 0 0', fontSize: 11, color: '#64748b' },
    layout: {
      flex: 1,
      display: 'flex',
      flexDirection: 'row',
      minHeight: 0,
      overflow: 'hidden',
    },
    nav: {
      width: 180,
      flexShrink: 0,
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      padding: '6px 0',
      overflowY: 'auto',
    },
    navItem: (active, color) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      padding: '6px 12px',
      border: 'none',
      borderLeft: active ? `3px solid ${color}` : '3px solid transparent',
      background: active ? `${color}14` : 'transparent',
      color: active ? color : '#475569',
      fontSize: 12,
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 0.15s, color 0.15s',
    }),
    content: {
      flex: 1,
      padding: 16,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: '#f1f5f9',
    },
    card: {
      background: '#ffffff',
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      padding: 16,
      width: '100%',
      flex: '0 0 auto',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: 600,
      color: '#111827',
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: '1px solid #e5e7eb',
      flexShrink: 0,
    },
    fieldGroup: { marginBottom: 10 },
    label: {
      display: 'block',
      fontSize: 11,
      fontWeight: 500,
      color: '#4b5563',
      marginBottom: 3,
    },
    input: {
      width: '100%',
      padding: '6px 10px',
      fontSize: 12,
      border: '1px solid #cbd5e1',
      borderRadius: 6,
      background: '#fff',
      color: '#1e293b',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '5px 8px',
      fontSize: 12,
      border: '1px solid #d1d5db',
      borderRadius: 4,
      background: '#fff',
      color: '#111827',
      resize: 'vertical',
      minHeight: 52,
      fontFamily: 'inherit',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '6px 10px',
      fontSize: 12,
      border: '1px solid #cbd5e1',
      borderRadius: 6,
      background: '#fff',
      color: '#1e293b',
      cursor: 'pointer',
      boxSizing: 'border-box',
    },
    btnPrimary: (color) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      fontSize: 12,
      fontWeight: 600,
      color: '#fff',
      background: loading ? '#94a3b8' : color,
      border: 'none',
      borderRadius: 4,
      cursor: loading ? 'not-allowed' : 'pointer',
    }),
    btnSecondary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      fontSize: 12,
      fontWeight: 500,
      color: '#4b5563',
      background: '#fff',
      border: '1px solid #d1d5db',
      borderRadius: 4,
      cursor: 'pointer',
    },
    mobileNavTrigger: {
      display: 'none',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '8px 12px',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      color: '#4b5563',
      cursor: 'pointer',
      marginBottom: 8,
    },
    listCard: {
      marginTop: 16,
      flex: '1 1 200px',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    },
    listCardTitle: {
      fontSize: 13,
      fontWeight: 600,
      color: '#334155',
      padding: '10px 14px',
      borderBottom: '1px solid #e2e8f0',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    },
    listHeader: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      borderBottom: '1px solid #e2e8f0',
      background: '#f8fafc',
    },
    listSearchInput: {
      flex: '1 1 200px',
      minWidth: 140,
      maxWidth: 280,
      padding: '6px 10px 6px 32px',
      fontSize: 12,
      border: '1px solid #cbd5e1',
      borderRadius: 6,
      background: '#fff',
    },
    listTableWrap: {
      flex: 1,
      minHeight: 0,
      overflowX: 'auto',
      overflowY: 'auto',
    },
    listTable: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
    },
    listTh: {
      textAlign: 'left',
      padding: '8px 10px',
      fontWeight: 600,
      color: '#334155',
      background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
      borderBottom: '1px solid #cbd5e1',
      whiteSpace: 'nowrap',
      fontSize: 11,
    },
    listTd: {
      padding: '6px 10px',
      borderBottom: '1px solid #f1f5f9',
      color: '#1e293b',
      fontSize: 12,
    },
    listPagination: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      padding: '8px 14px',
      borderTop: '1px solid #e2e8f0',
      background: '#f8fafc',
      fontSize: 12,
      color: '#64748b',
    },
    actionBtnEdit: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      padding: 0,
      margin: '0 2px',
      border: 'none',
      borderRadius: 6,
      background: '#dbeafe',
      color: '#1d4ed8',
      cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s, transform 0.1s',
    },
    actionBtnDelete: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      padding: 0,
      margin: '0 2px',
      border: 'none',
      borderRadius: 6,
      background: '#fee2e2',
      color: '#b91c1c',
      cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s, transform 0.1s',
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: 16,
    },
    modalCard: {
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      maxWidth: 400,
      width: '100%',
      padding: 20,
    },
  };

  return (
    <div style={baseStyles.page} className={`create-masters-zoho${navOpen ? ' create-masters-nav-open' : ''}`}>
      <header style={baseStyles.topBar}>
        <h1 style={baseStyles.title}>Create Masters</h1>
        <p style={baseStyles.subtitle}>Add and manage categories, products, designs, purity, counters, boxes, branches, rates, employees, vendors, and customers.</p>
      </header>

      {navOpen && (
        <div
          role="button"
          tabIndex={-1}
          onClick={() => setNavOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setNavOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 999,
            display: 'none',
          }}
          className="create-masters-nav-overlay"
          aria-hidden="true"
        />
      )}

      <div style={baseStyles.layout} className="create-masters-layout">
        <div
          style={{ ...baseStyles.mobileNavTrigger, display: 'flex' }}
          className="create-masters-mobile-trigger"
          onClick={() => setNavOpen(prev => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setNavOpen(prev => !prev)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: `${current.color}18`,
              color: current.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CurrentIcon size={12} />
            </span>
            {current.label}
          </span>
          <FaChevronRight size={14} style={{ transform: navOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        <nav
          style={{
            ...baseStyles.nav,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="create-masters-nav"
        >
          {MASTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeOption === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setActiveOption(opt.id);
                  setNavOpen(false);
                }}
                style={baseStyles.navItem(isActive, opt.color)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.color = '#1f2933';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#4a5568';
                  }
                }}
              >
                <span style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: isActive ? opt.color : `${opt.color}18`,
                  color: isActive ? '#fff' : opt.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={12} />
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
              </button>
            );
          })}
          <div
            style={{
              padding: '12px 14px 6px',
              marginTop: 6,
              borderTop: '1px solid #e5e7eb',
              fontSize: 11,
              fontWeight: 800,
              color: '#64748b',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Create Members
          </div>
          {MEMBER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeOption === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setActiveOption(opt.id);
                  setNavOpen(false);
                }}
                style={baseStyles.navItem(isActive, opt.color)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.color = '#1f2933';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#4a5568';
                  }
                }}
              >
                <span style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: isActive ? opt.color : `${opt.color}18`,
                  color: isActive ? '#fff' : opt.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={12} />
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={baseStyles.content} className="create-masters-layout-content">
          {activeOption === 'rates' ? (
            <div style={{ ...baseStyles.card, padding: 14, flex: '1 1 auto', minHeight: 0 }}>
              <div style={baseStyles.cardTitle}>Daily Rates (Category & Purity)</div>

              <div style={{ maxHeight: 520, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                {ratesLoading ? (
                  <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontWeight: 700 }}>
                    <FaSpinner size={14} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} />
                    Loading daily rates...
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'left', padding: '6px 8px' }}>Category</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'left', padding: '6px 8px' }}>Purity</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'right', padding: '6px 8px' }}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dropdownData.purities || [])
                        .slice()
                        .sort((a, b) => {
                          const catA = Number(a.CategoryId ?? a.categoryId ?? -1) || 0;
                          const catB = Number(b.CategoryId ?? b.categoryId ?? -1) || 0;
                          if (catA !== catB) return catA - catB;
                          const pA = Number(a.Id ?? a.id ?? a.PurityId ?? a.PurityID ?? 0) || 0;
                          const pB = Number(b.Id ?? b.id ?? b.PurityId ?? b.PurityID ?? 0) || 0;
                          return pA - pB;
                        })
                        .map((p) => {
                          const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
                          const catId = p.CategoryId ?? p.categoryId ?? '';
                          const categoryName = (dropdownData.categories || []).find((c) => String(c.Id ?? c.id ?? '') === String(catId))?.CategoryName ?? (dropdownData.categories || []).find((c) => String(c.Id ?? c.id ?? '') === String(catId))?.Name ?? '';

                          return (
                            <tr key={String(pId)} style={{ borderBottom: '1px solid #eef2f6' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>{categoryName}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0f172a' }}>{p.PurityName ?? p.Name ?? ''}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                <input
                                  type="text"
                                  value={ratesByPurityId[String(pId)] ?? ''}
                                  onChange={(e) => handleDailyRateChange(p, e.target.value)}
                                  style={{ width: 160, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 800, outline: 'none' }}
                                  disabled={ratesSaving}
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12 }}>
                <button
                  type="button"
                  onClick={handleSetRatesAdmin}
                  disabled={ratesLoading || ratesSaving}
                  style={baseStyles.btnPrimary('#0d9488')}
                >
                  {ratesSaving ? <FaSpinner size={12} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} /> : <FaCheck size={12} />}
                  Set Rates
                </button>
              </div>
            </div>
          ) : activeOption === 'employee' ? (
            <>
              <div
                style={{
                  ...baseStyles.card,
                  padding: '10px 12px 12px',
                  flex: '0 0 55%',
                  height: '55%',
                  minHeight: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
                className="create-masters-employee-form"
              >
                <h2 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
                  ADD EMPLOYEE
                </h2>
                <form onSubmit={handleEmployeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Personal Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px 8px' }}>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>First Name <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={employeeForm.firstName} onChange={(e) => updateEmployeeField('firstName', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Last Name <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={employeeForm.lastName} onChange={(e) => updateEmployeeField('lastName', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Emp Email <span style={{ color: '#dc2626' }}>*</span></label><input type="email" value={employeeForm.empEmail} onChange={(e) => updateEmployeeField('empEmail', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Contact Number <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={employeeForm.contactNo} onChange={(e) => updateEmployeeField('contactNo', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Street Address <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={employeeForm.streetAddress} onChange={(e) => updateEmployeeField('streetAddress', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Town</label><input type="text" value={employeeForm.town} onChange={(e) => updateEmployeeField('town', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Country <span style={{ color: '#dc2626' }}>*</span></label><select value={employeeForm.country} onChange={(e) => updateEmployeeField('country', e.target.value)} style={baseStyles.select}>{COUNTRY_OPTIONS.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>State <span style={{ color: '#dc2626' }}>*</span></label><select value={employeeForm.state} onChange={(e) => updateEmployeeField('state', e.target.value)} style={baseStyles.select}><option value="">Select a state</option>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>City <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={employeeForm.city} onChange={(e) => updateEmployeeField('city', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Aadhar No</label><input type="text" value={employeeForm.aadharNo} onChange={(e) => updateEmployeeField('aadharNo', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Pan No</label><input type="text" value={employeeForm.panNo} onChange={(e) => updateEmployeeField('panNo', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Joining Date</label><input type="date" value={employeeForm.joiningDate} onChange={(e) => updateEmployeeField('joiningDate', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Date Of Birth</label><input type="date" value={employeeForm.dob} onChange={(e) => updateEmployeeField('dob', e.target.value)} style={baseStyles.input} /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Gender</label><select value={employeeForm.gender} onChange={(e) => updateEmployeeField('gender', e.target.value)} style={baseStyles.select}><option value="">Select an option</option>{GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
                    </div>
                  </div>

                  <div style={{ paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>System Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px 8px' }}>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Branch <span style={{ color: '#dc2626' }}>*</span></label><select value={employeeForm.branch} onChange={(e) => updateEmployeeField('branch', e.target.value)} style={baseStyles.select}><option value="">Select branch</option>{(dropdownData.branches || []).map((b, i) => <option key={i} value={b.Id ?? b.id ?? ''}>{b.BranchName ?? b.Name ?? 'Branch'}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Department <span style={{ color: '#dc2626' }}>*</span></label><select value={employeeForm.department} onChange={(e) => updateEmployeeField('department', e.target.value)} style={baseStyles.select}><option value="">Select department</option>{DEPARTMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Counter <span style={{ color: '#dc2626' }}>*</span></label><select value={employeeForm.counter} onChange={(e) => updateEmployeeField('counter', e.target.value)} style={baseStyles.select}><option value="">Select counter</option>{(dropdownData.counters || []).map((c, i) => <option key={i} value={c.Id ?? c.id ?? ''}>{c.Name ?? c.CounterName ?? 'Counter'}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Roles <span style={{ color: '#dc2626' }}>*</span></label><select value={employeeForm.roles} onChange={(e) => updateEmployeeField('roles', e.target.value)} style={baseStyles.select}><option value="">Select role</option>{ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Reporting To</label><select value={employeeForm.reportingTo} onChange={(e) => updateEmployeeField('reportingTo', e.target.value)} style={baseStyles.select}><option value="">Select reporting</option>{employeeRows.map((emp, i) => { const id = emp.Id ?? emp.id ?? ''; const name = `${employeeDisplay(emp, 'FirstName', 'firstName')} ${employeeDisplay(emp, 'LastName', 'lastName')}`.trim(); return <option key={i} value={id}>{name}</option>; })}</select></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingTop: 6, borderTop: '1px solid #e5e7eb' }}>
                    <button type="button" onClick={handleEmployeeReset} style={baseStyles.btnSecondary}>
                      <FaRedoAlt size={12} />
                      Reset
                    </button>
                    <button type="submit" disabled={employeeSubmitting} style={{ ...baseStyles.btnPrimary('#2563eb'), background: employeeSubmitting ? '#94a3b8' : '#2563eb' }}>
                      {employeeSubmitting ? <FaSpinner size={12} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} /> : <FaCheck size={12} />}
                      Submit
                    </button>
                  </div>
                </form>
              </div>

              <div style={{ ...baseStyles.listCard, marginTop: 8, flex: '0 0 45%', height: '45%', minHeight: 240 }} className="create-masters-list-card">
                <div style={baseStyles.listCardTitle}>List of Employees</div>
                <div style={baseStyles.listHeader} className="create-masters-list-header">
                  <span style={{ position: 'relative', flex: '1 1 200px', minWidth: 140, maxWidth: 280 }}>
                    <FaSearch size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Search employee list..." value={employeeListSearch} onChange={(e) => { setEmployeeListSearch(e.target.value); setEmployeeListPage(1); }} style={baseStyles.listSearchInput} />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>
                    Total: {filteredEmployeeRows.length} record{filteredEmployeeRows.length !== 1 ? 's' : ''}
                  </span>
                  <select value={employeeListPageSize} onChange={(e) => { setEmployeeListPageSize(Number(e.target.value)); setEmployeeListPage(1); }} style={{ ...baseStyles.select, width: 'auto', minWidth: 60, padding: '4px 8px' }}>
                    {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div style={baseStyles.listTableWrap}>
                  <table style={baseStyles.listTable} className="create-masters-list-table">
                    <thead>
                      <tr>
                        <th style={baseStyles.listTh}>Sr. No.</th>
                        <th style={baseStyles.listTh}>First Name</th>
                        <th style={baseStyles.listTh}>Last Name</th>
                        <th style={baseStyles.listTh}>Emp Email</th>
                        <th style={baseStyles.listTh}>Contact</th>
                        <th style={baseStyles.listTh}>Branch</th>
                        <th style={baseStyles.listTh}>Department</th>
                        <th style={baseStyles.listTh}>Counter</th>
                        <th style={baseStyles.listTh}>Roles</th>
                        <th style={baseStyles.listTh}>Reporting To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeListLoading ? (
                        <tr><td colSpan={10} style={{ ...baseStyles.listTd, textAlign: 'center', color: '#64748b' }}><FaSpinner size={14} style={{ animation: 'create-masters-spin 0.7s linear infinite', verticalAlign: 'middle', marginRight: 8 }} />Loading employees…</td></tr>
                      ) : paginatedEmployeeRows.length === 0 ? (
                        <tr><td colSpan={10} style={{ ...baseStyles.listTd, textAlign: 'center', color: '#9ca3af' }}>{employeeRows.length === 0 ? 'No employee data. Add one above.' : 'No matches for search.'}</td></tr>
                      ) : (
                        paginatedEmployeeRows.map((row, idx) => {
                          const sr = (employeeSafePage - 1) * employeeListPageSize + idx + 1;
                          return (
                            <tr key={String(row.Id ?? row.id ?? idx)} className="create-masters-list-row">
                              <td style={baseStyles.listTd}>{sr}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'FirstName', 'firstName')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'LastName', 'lastName')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'EmployeeEmail', 'Email', 'empEmail')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'ContactNumber', 'MobileNumber', 'contactNo')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'BranchName', 'branch')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'Department', 'department')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'CounterName', 'counter')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'Roles', 'Role', 'roles')}</td>
                              <td style={baseStyles.listTd}>{employeeDisplay(row, 'ReportingToName', 'ReportingTo', 'reportingTo')}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={baseStyles.listPagination} className="create-masters-list-pagination">
                  <span>Showing {filteredEmployeeRows.length === 0 ? 0 : (employeeSafePage - 1) * employeeListPageSize + 1}–{Math.min(employeeSafePage * employeeListPageSize, filteredEmployeeRows.length)} of {filteredEmployeeRows.length}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button type="button" onClick={() => setEmployeeListPage((p) => Math.max(1, p - 1))} disabled={employeeSafePage <= 1} style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}>Prev</button>
                    <span style={{ padding: '0 6px' }}>Page {employeeSafePage} of {employeeTotalPages}</span>
                    <button type="button" onClick={() => setEmployeeListPage((p) => Math.min(employeeTotalPages, p + 1))} disabled={employeeSafePage >= employeeTotalPages} style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}>Next</button>
                  </span>
                </div>
              </div>
            </>
          ) : activeOption === 'vendor' ? (
            <>
            <div
              style={{
                ...baseStyles.card,
                padding: '10px 12px 12px',
                flex: '0 0 55%',
                height: '75%',
                minHeight: 380,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              className="create-masters-vendor-form"
            >
              <h2
                style={{
                  margin: '0 0 8px',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '0.04em',
                }}
              >
                ADD VENDOR
              </h2>
              <form onSubmit={handleVendorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Vendor Details */}
                <div style={{ paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Vendor Details</div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '6px 8px',
                    }}
                  >
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Vendor Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        value={vendorForm.vendorName}
                        onChange={(e) => updateVendorField('vendorName', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Vendor name"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        value={vendorForm.companyName}
                        onChange={(e) => updateVendorField('companyName', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Company name"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Email</label>
                      <input
                        type="email"
                        value={vendorForm.email}
                        onChange={(e) => updateVendorField('email', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Email"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Contact Number <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        value={vendorForm.contactNumber}
                        onChange={(e) => updateVendorField('contactNumber', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Contact number"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Aadhar Number</label>
                      <input
                        type="text"
                        value={vendorForm.aadharNumber}
                        onChange={(e) => updateVendorField('aadharNumber', e.target.value)}
                        style={baseStyles.input}
                        placeholder="0"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Pan Number</label>
                      <input
                        type="text"
                        value={vendorForm.panNumber}
                        onChange={(e) => updateVendorField('panNumber', e.target.value)}
                        style={baseStyles.input}
                        placeholder="PAN"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Remarks</label>
                      <input
                        type="text"
                        value={vendorForm.remarks}
                        onChange={(e) => updateVendorField('remarks', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Remarks"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Details */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Address Details</div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '6px 8px',
                    }}
                  >
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Street</label>
                      <input
                        type="text"
                        value={vendorForm.street}
                        onChange={(e) => updateVendorField('street', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Street"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Area</label>
                      <input
                        type="text"
                        value={vendorForm.area}
                        onChange={(e) => updateVendorField('area', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Area"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Town</label>
                      <input
                        type="text"
                        value={vendorForm.town}
                        onChange={(e) => updateVendorField('town', e.target.value)}
                        style={baseStyles.input}
                        placeholder="Town"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>City</label>
                      <input
                        type="text"
                        value={vendorForm.city}
                        onChange={(e) => updateVendorField('city', e.target.value)}
                        style={baseStyles.input}
                        placeholder="City"
                      />
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Country <span style={{ color: '#dc2626' }}>*</span></label>
                      <select
                        value={vendorForm.country}
                        onChange={(e) => updateVendorField('country', e.target.value)}
                        style={baseStyles.select}
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>State <span style={{ color: '#dc2626' }}>*</span></label>
                      <select
                        value={vendorForm.state}
                        onChange={(e) => updateVendorField('state', e.target.value)}
                        style={baseStyles.select}
                      >
                        <option value="">Select a state</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={baseStyles.fieldGroup}>
                      <label style={baseStyles.label}>Pincode</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={vendorForm.pincode}
                        onChange={(e) => updateVendorField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        style={baseStyles.input}
                        placeholder="Enter 6 digit pincode"
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    gap: 8,
                    paddingTop: 6,
                    borderTop: '1px solid #e5e7eb',
                  }}
                >
                  <button type="button" onClick={handleVendorReset} style={baseStyles.btnSecondary}>
                    <FaRedoAlt size={12} />
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={vendorSubmitting}
                    style={{ ...baseStyles.btnPrimary('#2563eb'), background: vendorSubmitting ? '#94a3b8' : '#2563eb' }}
                  >
                    {vendorSubmitting ? (
                      <FaSpinner size={12} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} />
                    ) : (
                      <FaCheck size={12} />
                    )}
                    Submit
                  </button>
                </div>
              </form>
            </div>

            <div style={{ ...baseStyles.listCard, marginTop: 8, flex: '0 0 45%', height: '45%', minHeight: 240 }} className="create-masters-list-card">
              <div style={baseStyles.listCardTitle}>List of Vendors</div>
              <div style={baseStyles.listHeader} className="create-masters-list-header">
                <span style={{ position: 'relative', flex: '1 1 200px', minWidth: 140, maxWidth: 280 }}>
                  <FaSearch size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search vendor list..."
                    value={vendorListSearch}
                    onChange={(e) => {
                      setVendorListSearch(e.target.value);
                      setVendorListPage(1);
                    }}
                    style={baseStyles.listSearchInput}
                    aria-label="Search vendor list"
                  />
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>
                  Total: {filteredVendorRows.length} record{filteredVendorRows.length !== 1 ? 's' : ''}
                </span>
                <select
                  value={vendorListPageSize}
                  onChange={(e) => {
                    setVendorListPageSize(Number(e.target.value));
                    setVendorListPage(1);
                  }}
                  style={{ ...baseStyles.select, width: 'auto', minWidth: 60, padding: '4px 8px' }}
                  aria-label="Rows per page"
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div style={baseStyles.listTableWrap}>
                <table style={baseStyles.listTable} className="create-masters-list-table">
                  <thead>
                    <tr>
                      <th style={baseStyles.listTh}>Sr. No.</th>
                      <th style={baseStyles.listTh}>Vendor Name</th>
                      <th style={baseStyles.listTh}>Company Name</th>
                      <th style={baseStyles.listTh}>Contact</th>
                      <th style={baseStyles.listTh}>City</th>
                      <th style={baseStyles.listTh}>State</th>
                      <th style={baseStyles.listTh}>Vendor Type</th>
                      <th style={{ ...baseStyles.listTh, width: 90, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorListLoading ? (
                      <tr>
                        <td colSpan={8} style={{ ...baseStyles.listTd, textAlign: 'center', color: '#64748b' }}>
                          <FaSpinner size={14} style={{ animation: 'create-masters-spin 0.7s linear infinite', verticalAlign: 'middle', marginRight: 8 }} />
                          Loading vendors…
                        </td>
                      </tr>
                    ) : paginatedVendorRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ ...baseStyles.listTd, textAlign: 'center', color: '#9ca3af' }}>
                          {vendorRows.length === 0 ? 'No vendor data. Add one above.' : 'No matches for search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedVendorRows.map((row, idx) => {
                        const rowId = row.Id ?? row.id ?? idx;
                        const sr = (vendorSafePage - 1) * vendorListPageSize + idx + 1;
                        return (
                          <tr key={String(rowId)} className="create-masters-list-row">
                            <td style={baseStyles.listTd}>{sr}</td>
                            <td style={baseStyles.listTd}>{vendorDisplay(row, 'PartyName', 'VendorName', 'vendorName', 'Name')}</td>
                            <td style={baseStyles.listTd}>{vendorDisplay(row, 'CompanyName', 'companyName')}</td>
                            <td style={baseStyles.listTd}>{vendorDisplay(row, 'ContactNumber', 'Mobile', 'Phone')}</td>
                            <td style={baseStyles.listTd}>{vendorDisplay(row, 'City', 'city')}</td>
                            <td style={baseStyles.listTd}>{vendorDisplay(row, 'State', 'state')}</td>
                            <td style={baseStyles.listTd}>{vendorDisplay(row, 'VendorType', 'vendorType')}</td>
                            <td style={{ ...baseStyles.listTd, padding: '4px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <span className="create-masters-action-cell">
                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() => toast.info('Vendor edit will use the same form when the update API is connected.')}
                                  style={baseStyles.actionBtnEdit}
                                  className="create-masters-btn-icon create-masters-btn-edit"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={() => toast.info('Vendor delete can be wired when the delete API is available.')}
                                  style={baseStyles.actionBtnDelete}
                                  className="create-masters-btn-icon create-masters-btn-delete"
                                >
                                  <FaTrashAlt size={12} />
                                </button>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div style={baseStyles.listPagination} className="create-masters-list-pagination">
                <span>
                  Showing {filteredVendorRows.length === 0 ? 0 : (vendorSafePage - 1) * vendorListPageSize + 1}–{Math.min(vendorSafePage * vendorListPageSize, filteredVendorRows.length)} of {filteredVendorRows.length}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setVendorListPage((p) => Math.max(1, p - 1))}
                    disabled={vendorSafePage <= 1}
                    style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}
                  >
                    Prev
                  </button>
                  <span style={{ padding: '0 6px' }}>Page {vendorSafePage} of {vendorTotalPages}</span>
                  <button
                    type="button"
                    onClick={() => setVendorListPage((p) => Math.min(vendorTotalPages, p + 1))}
                    disabled={vendorSafePage >= vendorTotalPages}
                    style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}
                  >
                    Next
                  </button>
                </span>
              </div>
            </div>
            </>
          ) : activeOption === 'customer' ? (
            <>
              <div
                style={{
                  ...baseStyles.card,
                  padding: '10px 12px 12px',
                  flex: '0 0 55%',
                  height: '75%',
                  minHeight: 380,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
                className="create-masters-customer-form"
              >
                <h2 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>ADD CUSTOMER</h2>
                <form onSubmit={handleCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Customer Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px 8px' }}>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>First Name <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={customerForm.firstName} onChange={(e) => updateCustomerField('firstName', e.target.value)} style={baseStyles.input} placeholder="First name" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Last Name <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={customerForm.lastName} onChange={(e) => updateCustomerField('lastName', e.target.value)} style={baseStyles.input} placeholder="Last name" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Company Name</label><input type="text" value={customerForm.companyName} onChange={(e) => updateCustomerField('companyName', e.target.value)} style={baseStyles.input} placeholder="Company" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Email</label><input type="email" value={customerForm.email} onChange={(e) => updateCustomerField('email', e.target.value)} style={baseStyles.input} placeholder="Email" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Mobile <span style={{ color: '#dc2626' }}>*</span></label><input type="text" value={customerForm.contactNumber} onChange={(e) => updateCustomerField('contactNumber', e.target.value)} style={baseStyles.input} placeholder="Mobile number" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Aadhar Number</label><input type="text" value={customerForm.aadharNumber} onChange={(e) => updateCustomerField('aadharNumber', e.target.value)} style={baseStyles.input} placeholder="0" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Pan Number</label><input type="text" value={customerForm.panNumber} onChange={(e) => updateCustomerField('panNumber', e.target.value)} style={baseStyles.input} placeholder="PAN" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Remarks</label><input type="text" value={customerForm.remarks} onChange={(e) => updateCustomerField('remarks', e.target.value)} style={baseStyles.input} placeholder="Remarks" /></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Address Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px 8px' }}>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Street</label><input type="text" value={customerForm.street} onChange={(e) => updateCustomerField('street', e.target.value)} style={baseStyles.input} placeholder="Street" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Area</label><input type="text" value={customerForm.area} onChange={(e) => updateCustomerField('area', e.target.value)} style={baseStyles.input} placeholder="Area" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Town</label><input type="text" value={customerForm.town} onChange={(e) => updateCustomerField('town', e.target.value)} style={baseStyles.input} placeholder="Town" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>City</label><input type="text" value={customerForm.city} onChange={(e) => updateCustomerField('city', e.target.value)} style={baseStyles.input} placeholder="City" /></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Country <span style={{ color: '#dc2626' }}>*</span></label><select value={customerForm.country} onChange={(e) => updateCustomerField('country', e.target.value)} style={baseStyles.select}>{COUNTRY_OPTIONS.map((co) => <option key={co.id} value={co.name}>{co.name}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>State <span style={{ color: '#dc2626' }}>*</span></label><select value={customerForm.state} onChange={(e) => updateCustomerField('state', e.target.value)} style={baseStyles.select}><option value="">Select a state</option>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                      <div style={baseStyles.fieldGroup}><label style={baseStyles.label}>Pincode</label><input type="text" inputMode="numeric" maxLength={6} value={customerForm.pincode} onChange={(e) => updateCustomerField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} style={baseStyles.input} placeholder="6 digits" /></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingTop: 6, borderTop: '1px solid #e5e7eb' }}>
                    <button type="button" onClick={handleCustomerReset} style={baseStyles.btnSecondary}><FaRedoAlt size={12} /> Reset</button>
                    <button type="submit" disabled={customerSubmitting} style={{ ...baseStyles.btnPrimary('#15803d'), background: customerSubmitting ? '#94a3b8' : '#15803d' }}>
                      {customerSubmitting ? <FaSpinner size={12} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} /> : <FaCheck size={12} />} Submit
                    </button>
                  </div>
                </form>
              </div>
              <div style={{ ...baseStyles.listCard, marginTop: 8, flex: '0 0 45%', height: '45%', minHeight: 240 }} className="create-masters-list-card">
                <div style={baseStyles.listCardTitle}>List of Customers</div>
                <div style={baseStyles.listHeader} className="create-masters-list-header">
                  <span style={{ position: 'relative', flex: '1 1 200px', minWidth: 140, maxWidth: 280 }}>
                    <FaSearch size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Search customers..." value={customerListSearch} onChange={(e) => { setCustomerListSearch(e.target.value); setCustomerListPage(1); }} style={baseStyles.listSearchInput} aria-label="Search customer list" />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>Total: {filteredCustomerRows.length} record{filteredCustomerRows.length !== 1 ? 's' : ''}</span>
                  <select value={customerListPageSize} onChange={(e) => { setCustomerListPageSize(Number(e.target.value)); setCustomerListPage(1); }} style={{ ...baseStyles.select, width: 'auto', minWidth: 60, padding: '4px 8px' }}>{[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                </div>
                <div style={baseStyles.listTableWrap}>
                  <table style={baseStyles.listTable} className="create-masters-list-table">
                    <thead>
                      <tr>
                        <th style={baseStyles.listTh}>Sr. No.</th>
                        <th style={baseStyles.listTh}>Name</th>
                        <th style={baseStyles.listTh}>Company</th>
                        <th style={baseStyles.listTh}>Email</th>
                        <th style={baseStyles.listTh}>Mobile</th>
                        <th style={baseStyles.listTh}>City</th>
                        <th style={baseStyles.listTh}>State</th>
                        <th style={{ ...baseStyles.listTh, width: 90, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerListLoading ? (
                        <tr><td colSpan={8} style={{ ...baseStyles.listTd, textAlign: 'center', color: '#64748b' }}><FaSpinner size={14} style={{ animation: 'create-masters-spin 0.7s linear infinite', verticalAlign: 'middle', marginRight: 8 }} />Loading customers…</td></tr>
                      ) : paginatedCustomerRows.length === 0 ? (
                        <tr><td colSpan={8} style={{ ...baseStyles.listTd, textAlign: 'center', color: '#9ca3af' }}>{customerRows.length === 0 ? 'No customers yet. Add one above.' : 'No matches for search.'}</td></tr>
                      ) : (
                        paginatedCustomerRows.map((row, idx) => {
                          const sr = (customerSafePage - 1) * customerListPageSize + idx + 1;
                          const fullName = [customerDisplay(row, 'FirstName', 'firstName'), customerDisplay(row, 'LastName', 'lastName')].filter((x) => x && x !== '—').join(' ').trim()
                            || customerDisplay(row, 'Name', 'CustomerName');
                          return (
                            <tr key={String(row.Id ?? row.id ?? idx)} className="create-masters-list-row">
                              <td style={baseStyles.listTd}>{sr}</td>
                              <td style={baseStyles.listTd}>{fullName}</td>
                              <td style={baseStyles.listTd}>{customerDisplay(row, 'CompanyName', 'companyName')}</td>
                              <td style={baseStyles.listTd}>{customerDisplay(row, 'Email', 'email')}</td>
                              <td style={baseStyles.listTd}>{customerDisplay(row, 'Mobile', 'MobileNumber', 'ContactNumber')}</td>
                              <td style={baseStyles.listTd}>{customerDisplay(row, 'City', 'city')}</td>
                              <td style={baseStyles.listTd}>{customerDisplay(row, 'State', 'state')}</td>
                              <td style={{ ...baseStyles.listTd, padding: '4px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span className="create-masters-action-cell">
                                  <button type="button" title="Edit" onClick={() => toast.info('Customer edit when update API is connected.')} style={baseStyles.actionBtnEdit} className="create-masters-btn-icon create-masters-btn-edit"><FaEdit size={12} /></button>
                                  <button type="button" title="Delete" onClick={() => toast.info('Customer delete when delete API is available.')} style={baseStyles.actionBtnDelete} className="create-masters-btn-icon create-masters-btn-delete"><FaTrashAlt size={12} /></button>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={baseStyles.listPagination} className="create-masters-list-pagination">
                  <span>Showing {filteredCustomerRows.length === 0 ? 0 : (customerSafePage - 1) * customerListPageSize + 1}–{Math.min(customerSafePage * customerListPageSize, filteredCustomerRows.length)} of {filteredCustomerRows.length}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button type="button" onClick={() => setCustomerListPage((p) => Math.max(1, p - 1))} disabled={customerSafePage <= 1} style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}>Prev</button>
                    <span style={{ padding: '0 6px' }}>Page {customerSafePage} of {customerTotalPages}</span>
                    <button type="button" onClick={() => setCustomerListPage((p) => Math.min(customerTotalPages, p + 1))} disabled={customerSafePage >= customerTotalPages} style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}>Next</button>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div ref={formCardRef} style={{ ...baseStyles.card, ['--create-masters-accent']: current.color }} className="create-masters-form-card">
                <h2 style={baseStyles.cardTitle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `${current.color}14`,
                      color: current.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <CurrentIcon size={14} />
                    </span>
                    {editingId ? `Edit ${current.label}` : `Add ${current.label}`}
                  </span>
                </h2>
                {activeOption === 'box' && (
                  <p style={{ margin: '0 0 10px', fontSize: 11, color: '#64748b', lineHeight: 1.45 }}>
                    Set box RFID here in one step (RFID Code + Hex). Then use{' '}
                    <strong style={{ color: '#0f766e' }}>Box RFID Pack</strong> to add labelled items and scan the tray.
                  </p>
                )}
                <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
                  <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 12px', alignContent: 'start' }} className="create-masters-fields-grid">
                    {fields.map((f) => {
                      if (activeOption === 'box' && f.key === 'hexCode') return null;
                      if (activeOption === 'box' && f.key === 'tidNumber' && boxRfidTagMode === 'reuse') return null;

                      if (activeOption === 'box' && f.key === 'rfidCode') {
                        const isReuse = boxRfidTagMode === 'reuse';
                        const rfidTrim = String(formData.rfidCode || '').trim();
                        const hasRfidMoreThan4 = rfidTrim.length > 4;
                        const showTidPresent = hasRfidMoreThan4 && Boolean(formData.hexCode || formData.tidNumber);
                        const showTidMissing = hasRfidMoreThan4 && !boxRfidLookupLoading && !showTidPresent && !boxRfidLookupError;
                        const rfidInputOk = showTidPresent && !boxRfidLookupError;
                        const rfidInputBad = Boolean(boxRfidLookupError) || showTidMissing;
                        return (
                          <React.Fragment key="box-rfid-fields">
                            <div style={{ ...baseStyles.fieldGroup, gridColumn: '1 / -1' }}>
                              <label style={baseStyles.label}>RFID Tag Type</label>
                              <div style={{ display: 'inline-flex', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', background: '#f8fafc' }}>
                                {[
                                  { id: 'reuse', label: 'Reuse' },
                                  { id: 'singleUse', label: 'Single Use' },
                                ].map((opt) => {
                                  const active = boxRfidTagMode === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleBoxRfidModeChange(opt.id)}
                                      style={{
                                        padding: '6px 14px',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: active ? '#dc2626' : 'transparent',
                                        color: active ? '#ffffff' : '#64748b',
                                        transition: 'all 0.15s',
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <p style={{ margin: '6px 0 0', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
                                {isReuse
                                  ? 'Enter RFID Number — TID and Hex are fetched from the server (same as Add Stock).'
                                  : 'Enter Box RFID Code — hex is generated automatically from the code.'}
                              </p>
                            </div>
                            <div style={{ ...baseStyles.fieldGroup }}>
                              <label style={baseStyles.label}>
                                {isReuse ? 'RFID Number' : 'Box RFID Code'}
                                {isReuse && boxRfidLookupLoading ? (
                                  <FaSpinner size={10} style={{ marginLeft: 6, animation: 'create-masters-spin 0.7s linear infinite', verticalAlign: 'middle' }} />
                                ) : null}
                              </label>
                              <input
                                type="text"
                                value={formData.rfidCode ?? ''}
                                readOnly={false}
                                onChange={(e) => updateField('rfidCode', e.target.value)}
                                onBlur={() => {
                                  if (isReuse && rfidTrim.length > 4) fetchBoxTidForRfid(rfidTrim);
                                }}
                                placeholder={isReuse ? 'e.g. SJ0260' : 'e.g. SJ0260'}
                                style={{
                                  ...baseStyles.input,
                                  ...(isReuse
                                    ? {
                                        border: rfidInputBad
                                          ? '2px solid #dc2626'
                                          : rfidInputOk
                                            ? '2px solid #16a34a'
                                            : '2px solid #6366f1',
                                        background: rfidInputBad ? '#fef2f2' : rfidInputOk ? '#f0fdf4' : baseStyles.input.background,
                                      }
                                    : {}),
                                }}
                              />
                              {isReuse && boxRfidLookupError ? (
                                <span style={{ fontSize: 10, color: '#dc2626', marginTop: 4, display: 'block' }}>{boxRfidLookupError}</span>
                              ) : null}
                            </div>
                            {isReuse ? (
                              <div style={{ ...baseStyles.fieldGroup }}>
                                <label style={baseStyles.label}>TID</label>
                                <div
                                  title={formData.tidNumber || formData.hexCode || ''}
                                  style={{
                                    ...baseStyles.input,
                                    background: '#f8fafc',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: 34,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    cursor: 'default',
                                  }}
                                >
                                  {boxRfidLookupLoading ? '...' : formData.tidNumber || formData.hexCode || '—'}
                                </div>
                              </div>
                            ) : null}
                            <div style={{ ...baseStyles.fieldGroup }}>
                              <label style={baseStyles.label}>Hex Code</label>
                              <input
                                type="text"
                                value={formData.hexCode ?? ''}
                                readOnly={isReuse}
                                onChange={(e) => !isReuse && updateField('hexCode', e.target.value)}
                                placeholder={isReuse ? 'Auto from RFID lookup' : 'Auto from RFID code'}
                                style={{
                                  ...baseStyles.input,
                                  background: isReuse ? '#f1f5f9' : baseStyles.input.background,
                                  cursor: isReuse ? 'default' : 'text',
                                }}
                              />
                            </div>
                          </React.Fragment>
                        );
                      }

                      return (
                        <div key={f.key} data-colspan={f.colSpan || 1} style={{ ...baseStyles.fieldGroup }}>
                          <label style={baseStyles.label}>
                            {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                          </label>
                          {f.type === 'select' ? (
                            <select
                              value={formData[f.key] ?? ''}
                              onChange={(e) => updateField(f.key, e.target.value)}
                              style={baseStyles.select}
                            >
                              <option value="">{f.placeholder || `Select ${f.label}`}</option>
                              {(f.options || []).map((opt, i) => (
                                <option key={i} value={opt[f.optionValue] ?? opt.Id ?? opt.id ?? ''}>
                                  {opt[f.optionLabel] ?? opt.Name ?? opt.CategoryName ?? opt.ProductName ?? opt.DesignName ?? opt.PurityName ?? opt.BranchName ?? opt.CounterName ?? ''}
                                </option>
                              ))}
                            </select>
                          ) : f.type === 'textarea' ? (
                            <textarea
                              value={formData[f.key] ?? ''}
                              onChange={(e) => updateField(f.key, e.target.value)}
                              placeholder={f.placeholder}
                              style={{ ...baseStyles.textarea, minHeight: f.colSpan === 3 ? 56 : 48 }}
                            />
                          ) : (
                            <input
                              type={f.type || 'text'}
                              value={formData[f.key] ?? ''}
                              onChange={(e) => updateField(f.key, e.target.value)}
                              placeholder={f.placeholder}
                              style={baseStyles.input}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="create-masters-form-actions" style={{ flexShrink: 0, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    <div className="create-masters-form-actions-inner">
                      <button type="button" onClick={handleCancel} style={baseStyles.btnSecondary} className="create-masters-btn create-masters-btn-cancel">
                        <FaTimes size={12} />
                        Cancel
                      </button>
                      <button type="button" onClick={handleResetForm} style={baseStyles.btnSecondary} className="create-masters-btn create-masters-btn-reset">
                        <FaRedoAlt size={12} />
                        Reset
                      </button>
                      <button type="submit" disabled={loading} style={baseStyles.btnPrimary(current.color)} className="create-masters-btn create-masters-btn-save">
                        {loading ? <FaSpinner size={12} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} /> : <FaCheck size={12} />}
                        {loading ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update' : 'Save')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div style={baseStyles.listCard} className="create-masters-list-card">
                <div style={baseStyles.listCardTitle}>List of {LIST_PLURAL[activeOption] ?? `${current.label}s`}</div>
                <div style={baseStyles.listHeader} className="create-masters-list-header">
                  <span style={{ position: 'relative', flex: '1 1 200px', minWidth: 140, maxWidth: 280 }}>
                    <FaSearch size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder={`Search ${current.label} list...`}
                      value={listSearch}
                      onChange={(e) => { setListSearch(e.target.value); setListPage(1); }}
                      style={baseStyles.listSearchInput}
                      aria-label={`Search ${current.label} list`}
                    />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>
                    Total: {filteredList.length} record{filteredList.length !== 1 ? 's' : ''}
                  </span>
                  <select
                    value={listPageSize}
                    onChange={(e) => { setListPageSize(Number(e.target.value)); setListPage(1); }}
                    style={{ ...baseStyles.select, width: 'auto', minWidth: 60, padding: '4px 8px' }}
                    aria-label="Rows per page"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div style={baseStyles.listTableWrap}>
                  <table style={baseStyles.listTable} className="create-masters-list-table">
                    <thead>
                      <tr>
                        {listColumns.map((col) => (
                          <th key={col.key} style={{ ...baseStyles.listTh, width: col.width }}>{col.label}</th>
                        ))}
                        <th key="_action" style={{ ...baseStyles.listTh, width: 90, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.length === 0 ? (
                        <tr>
                          <td colSpan={listColumns.length + 1} style={{ ...baseStyles.listTd, textAlign: 'center', color: '#9ca3af' }}>
                            {rawList.length === 0 ? `No ${current.label} data. Add one above.` : 'No matches for search.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedList.map((row, idx) => {
                          const rowId = row.Id ?? row.id ?? idx;
                          const isDeleting = deletingId === rowId;
                          const srNoVal = (safeListPage - 1) * listPageSize + idx + 1;
                          return (
                            <tr key={rowId} className="create-masters-list-row">
                              {listColumns.map((col) => (
                                <td key={col.key} style={baseStyles.listTd} title={col.key === 'srNo' ? undefined : getCellDisplay(row, col.key)}>
                                  {col.key === 'srNo' ? srNoVal : getCellDisplay(row, col.key)}
                                </td>
                              ))}
                              <td style={{ ...baseStyles.listTd, padding: '4px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span className="create-masters-action-cell">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(row)}
                                    title="Edit"
                                    aria-label={`Edit ${current.label}`}
                                    style={baseStyles.actionBtnEdit}
                                    className="create-masters-btn-icon create-masters-btn-edit"
                                  >
                                    <FaEdit size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(row)}
                                    disabled={isDeleting}
                                    title="Delete"
                                    aria-label={`Delete ${current.label}`}
                                    style={{ ...baseStyles.actionBtnDelete, opacity: isDeleting ? 0.6 : 1 }}
                                    className="create-masters-btn-icon create-masters-btn-delete"
                                  >
                                    {isDeleting ? <FaSpinner size={12} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} /> : <FaTrashAlt size={12} />}
                                  </button>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={baseStyles.listPagination} className="create-masters-list-pagination">
                  <span>
                    Showing {(safeListPage - 1) * listPageSize + 1}–{Math.min(safeListPage * listPageSize, filteredList.length)} of {filteredList.length}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                      disabled={safeListPage <= 1}
                      style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}
                    >
                      Prev
                    </button>
                    <span style={{ padding: '0 6px' }}>Page {safeListPage} of {totalListPages}</span>
                    <button
                      type="button"
                      onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                      disabled={safeListPage >= totalListPages}
                      style={{ ...baseStyles.btnSecondary, padding: '4px 8px', fontSize: 11 }}
                    >
                      Next
                    </button>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .create-masters-zoho .create-masters-form-card input:focus,
        .create-masters-zoho .create-masters-form-card select:focus,
        .create-masters-zoho .create-masters-form-card textarea:focus {
          outline: none;
          border-color: var(--create-masters-accent, #0d9488);
          box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.15);
        }
        @keyframes create-masters-spin { to { transform: rotate(360deg); } }
        .create-masters-form-actions-inner {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
        }
        @media (max-width: 480px) {
          .create-masters-form-actions-inner {
            flex-direction: column;
            width: 100%;
          }
          .create-masters-form-actions .create-masters-btn {
            width: 100%;
            justify-content: center;
          }
        }
        .create-masters-zoho .create-masters-fields-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        .create-masters-zoho .create-masters-fields-grid > [data-colspan="2"] { grid-column: span 2; }
        .create-masters-zoho .create-masters-fields-grid > [data-colspan="3"] { grid-column: span 3; }
        @media (max-width: 1024px) {
          .create-masters-zoho .create-masters-fields-grid { grid-template-columns: repeat(3, 1fr); }
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="3"] { grid-column: 1 / -1; }
        }
        @media (max-width: 640px) {
          .create-masters-zoho .create-masters-fields-grid { grid-template-columns: 1fr 1fr; }
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="2"],
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="3"] { grid-column: 1 / -1; }
        }
        @media (max-width: 480px) {
          .create-masters-zoho .create-masters-fields-grid { grid-template-columns: 1fr; }
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="2"],
          .create-masters-zoho .create-masters-fields-grid > [data-colspan="3"] { grid-column: span 1; }
        }
        @media (max-width: 768px) {
          .create-masters-zoho .create-masters-nav {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 1001;
            width: 220px;
            box-shadow: 4px 0 12px rgba(0,0,0,0.08);
            transform: translateX(-100%);
            transition: transform 0.2s ease;
          }
          .create-masters-zoho.create-masters-nav-open .create-masters-nav {
            transform: translateX(0);
          }
          .create-masters-zoho .create-masters-nav-overlay {
            display: block !important;
          }
          .create-masters-zoho .create-masters-mobile-trigger { display: flex !important; }
          .create-masters-zoho .create-masters-layout-content { padding: 10px !important; }
          .create-masters-zoho .create-masters-layout .create-masters-nav { display: flex !important; flex-direction: column !important; }
          .create-masters-zoho .create-masters-layout { flex-direction: column !important; }
        }
        @media (min-width: 769px) {
          .create-masters-zoho .create-masters-mobile-trigger { display: none !important; }
        }
        .create-masters-list-card { min-height: 180px; }
        .create-masters-list-table { border-radius: 6px; overflow: hidden; }
        .create-masters-list-table thead th { position: sticky; top: 0; z-index: 1; background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%) !important; box-shadow: 0 1px 0 #cbd5e1; }
        .create-masters-list-table th,
        .create-masters-list-table td { white-space: nowrap; }
        .create-masters-list-row { transition: background 0.12s ease; }
        .create-masters-list-row:hover { background: #f1f5f9; }
        .create-masters-action-cell { display: inline-flex; align-items: center; justify-content: center; gap: 2px; }
        .create-masters-btn-edit:hover { background: #bfdbfe !important; color: #1e40af !important; transform: scale(1.05); }
        .create-masters-btn-delete:hover { background: #fecaca !important; color: #991b1b !important; transform: scale(1.05); }
        .create-masters-btn-icon:disabled { cursor: not-allowed; }
        .create-masters-list-pagination { flex-wrap: wrap; }
        .create-masters-vendor-form label,
        .create-masters-employee-form label { font-size: 10px !important; margin-bottom: 2px !important; }
        .create-masters-vendor-form input,
        .create-masters-vendor-form select,
        .create-masters-employee-form input,
        .create-masters-employee-form select {
          padding: 4px 8px !important;
          min-height: 28px !important;
          font-size: 11px !important;
          border-radius: 5px !important;
        }
        @media (max-width: 640px) {
          .create-masters-list-header {
            flex-direction: column;
            align-items: stretch;
          }
          .create-masters-list-header input { max-width: none; }
          .create-masters-list-pagination {
            flex-direction: column;
            align-items: flex-start;
          }
          .create-masters-btn-icon { min-width: 32px; min-height: 32px; }
        }
        @media (max-width: 480px) {
          .create-masters-zoho .create-masters-layout-content { padding: 10px; }
          .create-masters-list-card .create-masters-list-table { font-size: 10px; }
          .create-masters-action-cell { flex-wrap: wrap; justify-content: center; }
        }
      `}</style>

      {deleteConfirm && (
        <div
          style={baseStyles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <div style={baseStyles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-dialog-title" style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#111827' }}>
              Delete {deleteConfirm.masterLabel}?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                style={baseStyles.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingId != null}
                style={{ ...baseStyles.btnPrimary('#dc2626') }}
              >
                {deletingId != null ? <FaSpinner size={12} style={{ animation: 'create-masters-spin 0.7s linear infinite' }} /> : <FaTrashAlt size={12} />}
                {deletingId != null ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMasters;
