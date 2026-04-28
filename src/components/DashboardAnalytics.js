import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from '../hooks/useTranslation';
import { 
  FaChartLine, 
  FaChartBar, 
  FaGem, 
  FaWeight, 
  FaStore, 
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaSyncAlt,
  FaCoins,
  FaCheck,
  FaBoxes,
  FaSearch,
  FaTachometerAlt,
  FaShoppingCart,
  FaBuilding,
  FaUsers,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaTags
} from 'react-icons/fa';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';
import { useNotifications } from '../context/NotificationContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const DashboardAnalytics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [counterSearch, setCounterSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [counterPage, setCounterPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState(null);
  const [tagUsageData, setTagUsageData] = useState(null);
  const [tagUsageLoading, setTagUsageLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [dummyTagUsage, setDummyTagUsage] = useState({ used: 350, unused: 180 });
  const [soldItemsApiCount, setSoldItemsApiCount] = useState(null);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesSaving, setRatesSaving] = useState(false);
  const [categoriesMaster, setCategoriesMaster] = useState([]);
  const [puritiesMaster, setPuritiesMaster] = useState([]);
  const [dailyRatesRows, setDailyRatesRows] = useState([]);
  const [ratesByPurityId, setRatesByPurityId] = useState({});
  const [initialRatesByPurityId, setInitialRatesByPurityId] = useState({});
  const [basePurityIdByCategoryId, setBasePurityIdByCategoryId] = useState({});
  const [baseFineByCategoryId, setBaseFineByCategoryId] = useState({});
  const [hoveredCategoryRing, setHoveredCategoryRing] = useState(null);
  const itemsPerPage = 5;
  const { addNotification } = useNotifications();

  const ratesCategoryColorPalette = [
    '#0d9488', // teal
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#ef4444', // red
    '#8b5cf6', // violet
    '#14b8a6', // emerald
    '#10b981', // green
  ];

  const getCategoryAccentColor = (categoryId) => {
    const n = Number(categoryId) || 0;
    return ratesCategoryColorPalette[n % ratesCategoryColorPalette.length];
  };

  // Get client code from localStorage
  const getClientCode = () => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        return JSON.parse(userInfo).ClientCode;
      } catch (err) {
        console.error('Error parsing userInfo:', err);
        return null;
      }
    }
    return null;
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const clientCode = getClientCode();
      
      if (!clientCode) {
        throw new Error(t('analytics.errorLoadingData'));
      }

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllStockAndroid',
        { ClientCode: clientCode }
      );

      // Handle different response structures
      let dataArray = [];
      if (Array.isArray(response.data)) {
        dataArray = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
      } else if (response.data && response.data.Result && Array.isArray(response.data.Result)) {
        dataArray = response.data.Result;
      } else if (response.data && typeof response.data === 'object') {
        // If response is an object, try to extract array from common properties
        dataArray = response.data.Stock || response.data.Items || response.data.Products || [];
      }

      if (dataArray && dataArray.length > 0) {
        setData(dataArray);
        setError(null);
      } else {
        // If no data but response is successful, set empty array
        setData([]);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || t('analytics.errorLoadingData'));
      toast.error(err.message || t('analytics.errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSoldItemsCount = async () => {
    try {
      const clientCode = getClientCode();
      if (!clientCode) return;

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllLabeledStock',
        {
          ClientCode: clientCode,
          Status: 'Sold',
        }
      );

      const responseData = response?.data;
      let totalCount = 0;

      if (Array.isArray(responseData)) {
        totalCount = responseData.length;
      } else if (responseData && typeof responseData === 'object') {
        if (Array.isArray(responseData.data)) {
          totalCount = Number(
            responseData.TotalCount ??
            responseData.totalCount ??
            responseData.TotalRecords ??
            responseData.totalRecords ??
            responseData.data?.[0]?.TotalCount ??
            responseData.data?.[0]?.totalCount ??
            responseData.data.length
          ) || 0;
        } else if (Array.isArray(responseData.Result)) {
          totalCount = Number(
            responseData.TotalCount ??
            responseData.totalCount ??
            responseData.TotalRecords ??
            responseData.totalRecords ??
            responseData.Result?.[0]?.TotalCount ??
            responseData.Result?.[0]?.totalCount ??
            responseData.Result.length
          ) || 0;
        } else {
          totalCount = Number(
            responseData.TotalCount ??
            responseData.totalCount ??
            responseData.TotalRecords ??
            responseData.totalRecords ??
            0
          ) || 0;
        }
      }

      setSoldItemsApiCount(totalCount);
    } catch (err) {
      console.error('Error fetching sold items count:', err);
      setSoldItemsApiCount(null);
    }
  };

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://rrgold.loyalstring.co.in';

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchRatesMasters = async () => {
    const clientCode = getClientCode();
    if (!clientCode) {
      toast.error('Client code not found');
      return { cats: [], purities: [] };
    }
    setRatesLoading(true);
    try {
      const body = { ClientCode: clientCode };
      const [catsRes, purRes] = await Promise.all([
        axios.post(`${API_BASE}/api/ProductMaster/GetAllCategory`, body, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.post(`${API_BASE}/api/ProductMaster/GetAllPurity`, body, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ]);

      const normalize = (res) => {
        if (!res) return [];
        const d = res.data ?? res;
        if (Array.isArray(d)) return d;
        if (d && Array.isArray(d.data)) return d.data;
        if (d && Array.isArray(d.Data)) return d.Data;
        return [];
      };

      const cats = normalize(catsRes);
      const purities = normalize(purRes);
      setCategoriesMaster(cats);
      setPuritiesMaster(purities);

      // Base purity per category for auto-calculation.
      // Prefer 24CT; otherwise pick the purity with highest FinePercentage.
      const nextBasePurityIdByCategory = {};
      const nextBaseFineByCategory = {};
      const byCategory = {};
      purities.forEach((p) => {
        const catId = p.CategoryId ?? p.categoryId ?? '';
        if (!catId && catId !== 0) return;
        const key = String(catId);
        if (!byCategory[key]) byCategory[key] = [];
        byCategory[key].push(p);
      });
      Object.entries(byCategory).forEach(([catKey, list]) => {
        const base24 = list.find((p) => String(p.PurityName ?? p.Name ?? '').trim().toUpperCase() === '24CT');
        const baseRow = base24
          ? base24
          : list.slice().sort((a, b) => (Number(b.FinePercentage ?? b.FinePercent ?? 0) || 0) - (Number(a.FinePercentage ?? a.FinePercent ?? 0) || 0))[0];
        if (!baseRow) return;
        const purityId = baseRow.Id ?? baseRow.id ?? baseRow.PurityId ?? baseRow.PurityID ?? '';
        const fine = Number(baseRow.FinePercentage ?? baseRow.FinePercent ?? 0) || 0;
        if (!purityId) return;
        nextBasePurityIdByCategory[catKey] = String(purityId);
        nextBaseFineByCategory[catKey] = fine;
      });

      setBasePurityIdByCategoryId(nextBasePurityIdByCategory);
      setBaseFineByCategoryId(nextBaseFineByCategory);

      return { cats, purities };
    } catch (e) {
      console.error('Error fetching rates masters:', e);
      toast.error('Failed to load rates');
      return { cats: [], purities: [] };
    } finally {
      setRatesLoading(false);
    }
  };

  const ensureRatesLoaded = async () => {
    if (categoriesMaster.length > 0 && puritiesMaster.length > 0) {
      return { cats: categoriesMaster, purities: puritiesMaster };
    }
    return await fetchRatesMasters();
  };

  const getCategoryNameForPurity = (purity) => {
    const categoryId = purity.CategoryId ?? purity.categoryId ?? purity.CategoryID;
    const cat = categoriesMaster.find(
      (c) => String(c.Id ?? c.id ?? '') === String(categoryId ?? '')
    );
    return cat ? (cat.CategoryName ?? cat.Name ?? cat.CategoryName ?? '') : (String(categoryId ?? '') || '—');
  };

  const normalizeRatesResponse = (res) => {
    const d = res?.data ?? res;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.Data)) return d.Data;
    if (d && Array.isArray(d.Result)) return d.Result;
    return [];
  };

  const fetchDailyRates = async (puritiesOverride) => {
    const purities = puritiesOverride ?? puritiesMaster;
    const clientCode = getClientCode();
    if (!clientCode) {
      toast.error('Client code not found');
      return;
    }

    setRatesLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/ProductMaster/GetAllDailyRate`,
        { ClientCode: clientCode },
        { headers: getAuthHeaders() }
      );

      const rows = normalizeRatesResponse(res);
      setDailyRatesRows(rows);

      // Fill rates map for *all* purities; missing ones stay empty so UI shows blank.
      const nextRates = {};
      const nextInitialRates = {};
      purities.forEach((p) => {
        const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
        if (!pId) return;
        nextRates[String(pId)] = '';
        nextInitialRates[String(pId)] = '';
      });

      rows.forEach((r) => {
        const pId = r.PurityId ?? r.purityId ?? r.Id ?? r.id ?? r.PurityID ?? '';
        if (!pId) return;
        const rateVal = r.Rate ?? '';
        const n = typeof rateVal === 'number' ? rateVal : Number(rateVal);
        const cleaned = rateVal === '' || rateVal == null || Number.isNaN(n) ? (rateVal ?? '') : String(Math.round(n));
        nextRates[String(pId)] = cleaned;
        nextInitialRates[String(pId)] = cleaned;
      });

      setRatesByPurityId(nextRates);
      setInitialRatesByPurityId(nextInitialRates);
    } catch (e) {
      console.error('Error fetching daily rates:', e);
      const msg = e?.response?.data?.message || e?.response?.data?.Message || e?.message || 'Failed to load daily rates';
      toast.error(msg);
      setDailyRatesRows([]);
      const emptyRates = {};
      purities.forEach((p) => {
        const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
        if (!pId) return;
        emptyRates[String(pId)] = '';
      });
      setRatesByPurityId(emptyRates);
      setInitialRatesByPurityId(emptyRates);
    } finally {
      setRatesLoading(false);
    }
  };

  const handleOpenRates = async () => {
    setRatesModalOpen(true);
    const { purities } = await ensureRatesLoaded();
    await fetchDailyRates(purities);
  };

  const handleRateChange = (row, nextValue) => {
    const normalizedValue = nextValue == null ? '' : String(nextValue).trim();
    const purityId = row.PurityId ?? row.purityId ?? row.Id ?? row.id ?? row.PurityID ?? '';
    const categoryId = row.CategoryId ?? row.categoryId ?? row.Id ?? row.id ?? '';

    if (!purityId || !categoryId) return;

    const catKey = String(categoryId);
    const purityKey = String(purityId);

    const getFinePct = (p) => Number(p?.FinePercentage ?? p?.FinePercent ?? 0) || 0;

    const categoryPurities = puritiesMaster.filter((p) => String(p.CategoryId ?? p.categoryId ?? '') === catKey);
    if (categoryPurities.length === 0) return;

    if (normalizedValue === '' || normalizedValue == null) {
      // Clear all rates for this category.
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

    const inputRate = Number(normalizedValue);
    if (Number.isNaN(inputRate)) return;

    // Pick base purity row for the category (prefer 24CT, else highest fine%).
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

    // If base fine% is missing, just set the typed row.
    if (!baseFine || baseFine <= 0) {
      setRatesByPurityId((prev) => ({ ...prev, [purityKey]: inputRate.toFixed(0) }));
      return;
    }

    // Determine base rate in terms of the selected base purity.
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
        next[String(pId)] = computedRate.toFixed(0);
      });
      return next;
    });
  };

  const handleSetRates = async () => {
    const clientCode = getClientCode();
    if (!clientCode) {
      toast.error('Client code not found');
      return;
    }

    if (!dailyRatesRows.length) {
      toast.info('No daily rates to update');
      return;
    }

    setRatesSaving(true);
    try {
      // Send only changed purity rows to avoid accidental clearing of untouched categories.
      const categoryNameById = {};
      categoriesMaster.forEach((c) => {
        const cId = c.Id ?? c.id ?? c.CategoryId ?? c.CategoryID ?? '';
        if (!cId) return;
        categoryNameById[String(cId)] = c.CategoryName ?? c.Name ?? '';
      });

      const payload = puritiesMaster
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
            EmployeeCode: clientCode,
            Rate: cur === '' ? '' : cur,
            PurityId: key,
            ClientCode: clientCode,
            CategoryName: categoryNameById[catKey] ?? '',
            PurityName: p.PurityName ?? p.Name ?? '',
            FinePercentage: p.FinePercentage ?? p.FinePercent ?? '',
          };
        })
        .filter(Boolean);

      if (payload.length === 0) {
        toast.info('No rate changes to save');
        return;
      }

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
        const msg = data?.message ?? data?.Message ?? data?.error ?? 'Update failed';
        throw new Error(typeof msg === 'string' ? msg : 'Update failed');
      }

      toast.success('Daily rates updated successfully');
      await fetchDailyRates(puritiesMaster);
    } catch (e) {
      console.error('Error updating daily rates:', e);
      const msg = e?.response?.data?.message || e?.response?.data?.Message || e?.message || 'Failed to update daily rates';
      toast.error(msg);
    } finally {
      setRatesSaving(false);
    }
  };

  const dailyRatesChangedCount = puritiesMaster.reduce((acc, p) => {
    const pId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
    if (!pId) return acc;
    const key = String(pId);
    const cur = ratesByPurityId[key] ?? '';
    const initial = initialRatesByPurityId[key] ?? '';
    return acc + (String(cur) !== String(initial) ? 1 : 0);
  }, 0);

  // Fetch tag usage data
  const fetchTagUsageData = async () => {
    try {
      setTagUsageLoading(true);
      const clientCode = getClientCode();
      
      console.log('Client Code for tag usage:', clientCode); // Debug log
      console.log('Full userInfo from localStorage:', localStorage.getItem('userInfo')); // Debug log
      
      if (!clientCode) {
        throw new Error(t('analytics.errorLoadingData'));
      }

      // Use the same format as the working TagUsage.js implementation
      const payload = { ClientCode: clientCode };
      console.log('Tag usage payload:', payload); // Debug log

      const response = await axios.post(
        'https://rrgold.loyalstring.co.in/api/ProductMaster/GetAllUsedAndUnusedTag',
        payload
      );

      console.log('Tag usage response:', response.data); // Debug log

      if (response.data) {
        setTagUsageData(response.data);
      } else {
        throw new Error('Invalid tag usage data format received');
      }
    } catch (err) {
      console.error('Error fetching tag usage data:', err);
      console.error('Error response:', err.response?.data); // Debug log
      toast.error(err.response?.data?.Message || t('analytics.errorLoadingData'));
    } finally {
      setTagUsageLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAnalyticsData(), fetchTagUsageData(), fetchSoldItemsCount()]);
    setRefreshing(false);
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    addNotification({
      title: t('analytics.dataRefreshed'),
      description: `${t('analytics.dataRefreshedBy')} ${userInfo?.Username || userInfo?.UserName || t('analytics.user')}`,
      type: 'info'
    });
  };

  // Animate loading progress counter
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev; // Stop at 95% until data loads
          return prev + Math.random() * 3 + 1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    const initializeData = async () => {
      setLoadingProgress(0);
      await fetchAnalyticsData();
      setLoadingProgress(100);
      // Add a small delay to ensure analytics data is loaded first
      setTimeout(() => {
        fetchTagUsageData();
        fetchSoldItemsCount();
      }, 500);
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, selectedCategory, loading, data.length]);

  useEffect(() => {
    setCounterPage(1);
  }, [counterSearch, selectedCategory, loading, data.length]);

  useEffect(() => {
    setCategoryPage(1);
  }, [selectedCategory, loading, data.length]);

  // Generate dummy data for loading state
  const generateDummyData = () => {
    const dummyItems = [];
    const categories = ['Gold', 'Silver', 'Diamond', 'Platinum', 'Gemstone'];
    const statuses = ['Active', 'Sold', 'Inactive', 'Pending'];
    const counters = ['Counter A', 'Counter B', 'Counter C', 'Counter D', 'Counter E'];
    const products = ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Pendant', 'Chain', 'Bangle', 'Coin'];
    
    for (let i = 0; i < 150; i++) {
      dummyItems.push({
        ProductName: products[Math.floor(Math.random() * products.length)],
        CategoryName: categories[Math.floor(Math.random() * categories.length)],
        Status: statuses[Math.floor(Math.random() * statuses.length)],
        CounterName: counters[Math.floor(Math.random() * counters.length)],
        GrossWt: (Math.random() * 50 + 5).toFixed(2),
        TodaysRate: Math.floor(Math.random() * 5000 + 2000)
      });
    }
    return dummyItems;
  };

  // Filter data based on selected filters
  const filteredData = loading ? generateDummyData() : data.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.CategoryName === selectedCategory;
    // Add date filtering logic here if needed
    return categoryMatch;
  });

  // Analytics calculations
  const getStatusDistribution = () => {
    const activeCount = filteredData.filter((item) => item.Status !== 'Sold').length;
    const soldCountFromInventory = filteredData.filter((item) => item.Status === 'Sold').length;
    const soldCount = soldItemsApiCount != null ? soldItemsApiCount : soldCountFromInventory;
    const labels = ['Active', 'Sold'];
    const values = [activeCount, soldCount];
    const statusColors = {
      Active: '#0d9488',
      Sold: '#dc2626'
    };

    return {
      labels,
      datasets: [{
        label: t('analytics.itemsCount'),
        data: values,
        backgroundColor: labels.map((label) => statusColors[label]),
        borderColor: labels.map((label) => statusColors[label]),
        borderWidth: 2,
        borderRadius: {
          topLeft: 8,
          topRight: 8,
          bottomLeft: 4,
          bottomRight: 4
        },
        borderSkipped: false,
        hoverBackgroundColor: ['#0f766e', '#b91c1c'],
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
        // Keep bars visually balanced, especially when only 1 status exists.
        maxBarThickness: 56,
        barThickness: 42,
        categoryPercentage: 0.56,
        barPercentage: 0.72,
      }]
    };
  };

  // 1. Define color palettes for categories and branches (modern palette)
  const categoryColorPalette = [
    '#6366f1', '#0d9488', '#ea580c', '#7c3aed', '#0891b2', '#dc2626', '#a855f7', '#2563eb', '#64748b', '#0f172a', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#22c55e', '#475569', '#ec4899', '#f472b6', '#1e293b'
  ];
  const branchColorPalette = [
    '#6366f1', '#0d9488', '#ea580c', '#7c3aed', '#0891b2', '#dc2626', '#2563eb', '#14b8a6', '#64748b', '#0f172a', '#a855f7', '#f59e0b', '#06b6d4', '#22c55e', '#475569', '#ec4899', '#1e293b', '#f472b6', '#8b5cf6', '#0ea5e9'
  ];

  const getCategoryDistribution = () => {
    const categoryCounts = filteredData.reduce((acc, item) => {
      acc[item.CategoryName] = (acc[item.CategoryName] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(categoryCounts);
    return {
      labels,
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: labels.map((_, i) => categoryColorPalette[i % categoryColorPalette.length]),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 4,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff',
      }]
    };
  };

  const getCategoryRingBreakdown = () => {
    const categoryCounts = filteredData.reduce((acc, item) => {
      const key = item.CategoryName || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    const rings = entries.slice(0, 5).map(([name, count], index) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      color: categoryColorPalette[index % categoryColorPalette.length],
    }));

    return { total, rings };
  };

  const getProductDistribution = () => {
    const productCounts = filteredData.reduce((acc, item) => {
      acc[item.ProductName] = (acc[item.ProductName] || 0) + 1;
      return acc;
    }, {});

    const sortedProducts = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    return {
      labels: sortedProducts.map(([name]) => name.length > 15 ? name.substring(0, 15) + '...' : name),
      datasets: [{
        label: t('analytics.itemsCount'),
        data: sortedProducts.map(([,count]) => count),
        backgroundColor: (context) => {
          const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
          const colors = [
            ['#0077d4', '#3b82f6'],
            ['#22c55e', '#34d399'], 
            ['#f59e0b', '#fbbf24'],
            ['#64748b', '#94a3b8'],
            ['#0077d4', '#60a5fa'],
            ['#22c55e', '#4ade80'],
            ['#f59e0b', '#fcd34d'],
            ['#64748b', '#a1a1aa']
          ];
          const colorPair = colors[context.dataIndex % colors.length];
          gradient.addColorStop(0, colorPair[0]);
          gradient.addColorStop(1, colorPair[1]);
          return gradient;
        },
        borderColor: [
          '#0077d4',
          '#22c55e', 
          '#f59e0b',
          '#64748b',
          '#0077d4',
          '#22c55e',
          '#f59e0b', 
          '#64748b'
        ],
        borderWidth: 0,
        borderRadius: {
          topLeft: 12,
          topRight: 12,
          bottomLeft: 4,
          bottomRight: 4
        },
        borderSkipped: false,
        hoverBackgroundColor: (context) => {
          const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
          const colors = [
            ['#0066cc', '#2563eb'],
            ['#16a34a', '#059669'], 
            ['#d97706', '#ea580c'],
            ['#475569', '#64748b'],
            ['#0066cc', '#3b82f6'],
            ['#16a34a', '#10b981'],
            ['#d97706', '#f59e0b'],
            ['#475569', '#6b7280']
          ];
          const colorPair = colors[context.dataIndex % colors.length];
          gradient.addColorStop(0, colorPair[0]);
          gradient.addColorStop(1, colorPair[1]);
          return gradient;
        },
                 hoverBorderWidth: 2,
         hoverBorderColor: '#ffffff',
      }]
    };
  };

  const getCounterDistribution = () => {
    const counterCounts = filteredData.reduce((acc, item) => {
      const counterName = item.CounterName || item.Counter || 'Unassigned';
      acc[counterName] = (acc[counterName] || 0) + 1;
      return acc;
    }, {});

    const sortedCounters = Object.entries(counterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    return {
      labels: sortedCounters.map(([name]) => name.length > 12 ? name.substring(0, 12) + '...' : name),
      datasets: [{
        label: t('analytics.itemsCount'),
        data: sortedCounters.map(([,count]) => count),
        backgroundColor: (context) => {
          const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
          const colors = [
            ['#22c55e', '#34d399'],
            ['#0077d4', '#3b82f6'],
            ['#f59e0b', '#fbbf24'], 
            ['#64748b', '#94a3b8'],
            ['#22c55e', '#4ade80'],
            ['#0077d4', '#60a5fa'],
            ['#f59e0b', '#fcd34d'],
            ['#64748b', '#a1a1aa']
          ];
          const colorPair = colors[context.dataIndex % colors.length];
          gradient.addColorStop(0, colorPair[0]);
          gradient.addColorStop(1, colorPair[1]);
          return gradient;
        },
        borderColor: [
          '#22c55e',
          '#0077d4',
          '#f59e0b',
          '#64748b',
          '#22c55e',
          '#0077d4',
          '#f59e0b',
          '#64748b'
        ],
        borderWidth: 0,
        borderRadius: {
          topLeft: 12,
          topRight: 12,
          bottomLeft: 4,
          bottomRight: 4
        },
        borderSkipped: false,
        hoverBackgroundColor: (context) => {
          const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
          const colors = [
            ['#16a34a', '#059669'],
            ['#0066cc', '#2563eb'],
            ['#d97706', '#ea580c'],
            ['#475569', '#64748b'],
            ['#16a34a', '#10b981'],
            ['#0066cc', '#3b82f6'],
            ['#d97706', '#f59e0b'],
            ['#475569', '#6b7280']
          ];
          const colorPair = colors[context.dataIndex % colors.length];
          gradient.addColorStop(0, colorPair[0]);
          gradient.addColorStop(1, colorPair[1]);
          return gradient;
        },
                 hoverBorderWidth: 2,
         hoverBorderColor: '#ffffff',
      }]
    };
  };

  const getWeightTrend = () => {
    const monthlyData = filteredData.reduce((acc, item) => {
      const month = new Date(item.CreatedOn).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { totalWeight: 0, count: 0 };
      }
      acc[month].totalWeight += parseFloat(item.GrossWt) || 0;
      acc[month].count += 1;
      return acc;
    }, {});

    const sortedMonths = Object.keys(monthlyData).sort((a, b) => new Date(a) - new Date(b));

    return {
      labels: sortedMonths,
      datasets: [{
        label: t('analytics.totalWeightGrams'),
        data: sortedMonths.map(month => monthlyData[month].totalWeight),
        borderColor: '#0077d4',
        backgroundColor: 'rgba(0, 119, 212, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#0077d4',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }]
    };
  };

  const getBranchDistribution = () => {
    const branchCounts = filteredData.reduce((acc, item) => {
      const branchName = item.BranchName || 'Unknown';
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {});

    const sortedBranches = Object.entries(branchCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    const labels = sortedBranches.map(([branch]) => branch);
    const values = sortedBranches.map(([, count]) => count);
    const colors = labels.map((_, index) => branchColorPalette[index % branchColorPalette.length]);

    return {
      labels,
      datasets: [{
        label: t('analytics.itemsCount'),
        data: values,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 10,
        cutout: '54%'
      }]
    };
  };

  // Update dummy tag usage data during loading
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDummyTagUsage(prev => ({
          used: prev.used + Math.floor(Math.random() * 10 - 5),
          unused: prev.unused + Math.floor(Math.random() * 10 - 5)
        }));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Get tag usage distribution data - 3 bars: Total RFID Tags, Used Tags, Unused Tags
  const getTagUsageDistribution = () => {
    if (!tagUsageData) {
      const dummyUsed = loading ? dummyTagUsage.used : 0;
      const dummyUnused = loading ? dummyTagUsage.unused : 0;
      const dummyTotal = dummyUsed + dummyUnused;
      return {
        labels: ['Total RFID Tags', 'Used Tags', 'Unused Tags'],
        datasets: [{
          label: t('analytics.tagCount'),
          data: [dummyTotal, dummyUsed, dummyUnused],
          backgroundColor: ['#2563eb', '#dc2626', '#16a34a'],
          borderColor: ['#2563eb', '#dc2626', '#16a34a'],
          borderWidth: 1,
          borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 4, bottomRight: 4 },
          borderSkipped: false,
          hoverBackgroundColor: ['#1d4ed8', '#b91c1c', '#15803d'],
          hoverBorderWidth: 2,
          hoverBorderColor: '#ffffff',
        }]
      };
    }

    const usedCount = tagUsageData.UsedCount || 0;
    const unusedCount = tagUsageData.UnusedCount || 0;
    const totalTags = usedCount + unusedCount;

    return {
      labels: ['Total RFID Tags', 'Used Tags', 'Unused Tags'],
      datasets: [{
        label: t('analytics.tagCount'),
        data: [totalTags, usedCount, unusedCount],
        backgroundColor: ['#2563eb', '#dc2626', '#16a34a'],
        borderColor: ['#2563eb', '#dc2626', '#16a34a'],
        borderWidth: 1,
        borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 4, bottomRight: 4 },
        borderSkipped: false,
        hoverBackgroundColor: ['#1d4ed8', '#b91c1c', '#15803d'],
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
      }]
    };
  };

  // Calculate summary statistics
  const totalItems = filteredData.length;
  const totalWeight = filteredData.reduce((sum, item) => sum + (parseFloat(item.GrossWt) || 0), 0);
  const totalRfidNew = (tagUsageData && (tagUsageData.UnusedCount != null)) ? (tagUsageData.UnusedCount || 0) : 0;
  const soldItems = filteredData.filter(item => item.Status === 'Sold').length;
  const soldItemsCount = soldItemsApiCount != null ? soldItemsApiCount : soldItems;
  const availableItems = filteredData.filter(item => item.Status !== 'Sold').length;
  const uniqueCounters = [...new Set(filteredData.map(item => item.CounterName || item.Counter || 'Unassigned'))].length;
  const topItemsTotalCount = Object.values(
    filteredData.reduce((acc, item) => {
      const product = item.ProductName || '-';
      const category = item.CategoryName || '-';
      const design = item.DesignName || item.DesignNo || item.Design || '-';
      const key = `${product}||${category}||${design}`;
      if (!acc[key]) acc[key] = { product, category, design, qty: 0 };
      acc[key].qty += 1;
      return acc;
    }, {})
  ).filter((row) =>
    row.product.toLowerCase().includes(productSearch.toLowerCase()) ||
    row.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    row.design.toLowerCase().includes(productSearch.toLowerCase())
  ).length;
  const counterWiseTotalCount = Object.entries(
    filteredData.reduce((acc, item) => {
      const counterName = item.CounterName || item.Counter || 'Unassigned';
      acc[counterName] = (acc[counterName] || 0) + 1;
      return acc;
    }, {})
  ).filter(([name]) => name && name.toLowerCase().includes(counterSearch.toLowerCase())).length;
  const categoryDistributionTotalCount = new Set(
    filteredData.map((item) => item.CategoryName || 'Unassigned')
  ).size;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12,
            family: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#0077d4',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          family: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        },
        bodyFont: {
          size: 13,
          family: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11,
            family: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11,
            family: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }
        }
      }
    }
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 40;

    // Logo (as before)
    const logoUrl = `${process.env.PUBLIC_URL || ''}/Logo/Sparkle%20RFID%20svg.svg`;
    const svgToPngDataUrl = async (svgUrl, width = 240, height = 80) => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = svgUrl;
      });
    };
    const logoPng = await svgToPngDataUrl(logoUrl, 120, 40);
    doc.addImage(logoPng, 'PNG', pageWidth/2 - 60, y, 120, 40);
    y += 60;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor('#232a36');
    doc.text(t('analytics.title'), pageWidth/2, y, { align: 'center' });
    y += 32;

    // Date/time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor('#64748b');
    doc.text(`${t('common.export')}: ${new Date().toLocaleString()}`, pageWidth/2, y, { align: 'center' });
    y += 30;

    // --- Status Distribution ---
    doc.setFillColor(230, 245, 233); // very light green
    doc.roundedRect(40, y, pageWidth-80, 32, 8, 8, 'F');
    doc.setFontSize(16);
    doc.setTextColor('#22c55e');
    doc.text(t('analytics.statusDistribution'), pageWidth/2, y+22, { align: 'center' });
    y += 48;
    // Table
    const statusCounts = filteredData.reduce((acc, item) => {
      acc[item.Status] = (acc[item.Status] || 0) + 1;
      return acc;
    }, {});
    const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const statusTable = Object.entries(statusCounts).map(([label, count]) => [
      label,
      count,
      `${((count/statusTotal)*100).toFixed(1)}%`
    ]);
    autoTable(doc, {
      startY: y,
      head: [[t('analytics.status'), t('analytics.count'), t('analytics.percentage')]],
      body: statusTable,
      theme: 'striped',
      headStyles: { fillColor: [230,245,233], textColor: '#22c55e', fontStyle: 'bold', fontSize: 12 },
      bodyStyles: { fontSize: 11, font: 'helvetica', textColor: '#232a36' },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { left: 40, right: 40 },
      styles: { cellPadding: 6, overflow: 'linebreak' },
    });
    y = doc.lastAutoTable.finalY + 8;
    // Insight
    doc.setFontSize(11);
    doc.setTextColor('#64748b');
    const topStatus = statusTable[0] ? statusTable[0][0] : '';
    doc.text(`Most items are ${topStatus}.`, 50, y + 12);
    y += 32;

    // --- Category Distribution ---
    doc.setFillColor(255, 249, 196); // very light gold
    doc.roundedRect(40, y, pageWidth-80, 32, 8, 8, 'F');
    doc.setFontSize(16);
    doc.setTextColor('#bfa100');
    doc.text(t('analytics.categoryDistribution'), pageWidth/2, y+22, { align: 'center' });
    y += 48;
    // Table
    const categoryCounts = filteredData.reduce((acc, item) => {
      acc[item.CategoryName] = (acc[item.CategoryName] || 0) + 1;
      return acc;
    }, {});
    const categoryTotal = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
    const categoryTable = Object.entries(categoryCounts).map(([label, count]) => [
      label,
      count,
      `${((count/categoryTotal)*100).toFixed(1)}%`
    ]);
    autoTable(doc, {
      startY: y,
      head: [[t('analytics.categoryName'), t('analytics.count'), t('analytics.percentage')]],
      body: categoryTable,
      theme: 'striped',
      headStyles: { fillColor: [255,249,196], textColor: '#bfa100', fontStyle: 'bold', fontSize: 12 },
      bodyStyles: { fontSize: 11, font: 'helvetica', textColor: '#232a36' },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { left: 40, right: 40 },
      styles: { cellPadding: 6, overflow: 'linebreak' },
    });
    y = doc.lastAutoTable.finalY + 8;
    // Insight
    doc.setFontSize(11);
    doc.setTextColor('#64748b');
    const topCategory = categoryTable[0] ? categoryTable[0][0] : '';
    doc.text(`Most items are in the ${topCategory} category.`, 50, y + 12);
    y += 32;

    // --- Branch Distribution ---
    doc.setFillColor(222, 235, 255); // very light blue
    doc.roundedRect(40, y, pageWidth-80, 32, 8, 8, 'F');
    doc.setFontSize(16);
    doc.setTextColor('#2563eb');
    doc.text(t('analytics.branchDistribution'), pageWidth/2, y+22, { align: 'center' });
    y += 48;
    // Table
    const branchCounts = filteredData.reduce((acc, item) => {
      acc[item.BranchName] = (acc[item.BranchName] || 0) + 1;
      return acc;
    }, {});
    const branchTotal = Object.values(branchCounts).reduce((a, b) => a + b, 0);
    const branchTable = Object.entries(branchCounts).map(([label, count]) => [
      label,
      count,
      `${((count/branchTotal)*100).toFixed(1)}%`
    ]);
    autoTable(doc, {
      startY: y,
      head: [[t('analytics.branchName'), t('analytics.count'), t('analytics.percentage')]],
      body: branchTable,
      theme: 'striped',
      headStyles: { fillColor: [222,235,255], textColor: '#2563eb', fontStyle: 'bold', fontSize: 12 },
      bodyStyles: { fontSize: 11, font: 'helvetica', textColor: '#232a36' },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { left: 40, right: 40 },
      styles: { cellPadding: 6, overflow: 'linebreak' },
    });
    y = doc.lastAutoTable.finalY + 8;
    // Insight
    doc.setFontSize(11);
    doc.setTextColor('#64748b');
    const topBranch = branchTable[0] ? branchTable[0][0] : '';
    doc.text(`Most items are in the ${topBranch} branch.`, 50, y + 12);
    y += 32;

    // --- Top Products, Top Vendors, Performance Metrics (as before, but lighter header colors) ---
    // Top Products
    doc.setFillColor(232, 240, 254); // very light blue
    doc.roundedRect(40, y, pageWidth-80, 32, 8, 8, 'F');
    doc.setFontSize(16);
    doc.setTextColor('#0077d4');
    doc.text(t('analytics.modal.topItems'), pageWidth/2, y+22, { align: 'center' });
    y += 48;
    autoTable(doc, {
      startY: y,
      head: [[t('analytics.rank'), t('analytics.productName'), t('analytics.count'), t('analytics.share')]],
      body: (() => {
        const productCounts = filteredData.reduce((acc, item) => {
          acc[item.ProductName] = (acc[item.ProductName] || 0) + 1;
          return acc;
        }, {});
        const sortedProducts = Object.entries(productCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8);
        const total = Object.values(productCounts).reduce((a, b) => a + b, 0);
        return sortedProducts.map(([name, count], idx) => [
          idx+1,
          name,
          count,
          `${((count/total)*100).toFixed(1)}%`
        ]);
      })(),
      theme: 'striped',
      headStyles: { fillColor: [232,240,254], textColor: '#0077d4', fontStyle: 'bold', fontSize: 12 },
      bodyStyles: { fontSize: 11, font: 'helvetica', textColor: '#232a36' },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { left: 40, right: 40 },
      styles: { cellPadding: 6, overflow: 'linebreak' },
    });
    y = doc.lastAutoTable.finalY + 32;

    // Counter Wise Stock Check
    doc.setFillColor(232, 254, 240); // very light green
    doc.roundedRect(40, y, pageWidth-80, 32, 8, 8, 'F');
    doc.setFontSize(16);
    doc.setTextColor('#22c55e');
    doc.text('Counter Wise Stock Check', pageWidth/2, y+22, { align: 'center' });
    y += 48;
    autoTable(doc, {
      startY: y,
      head: [[t('analytics.rank'), 'Counter Name', t('analytics.items'), t('analytics.performance')]],
      body: (() => {
        const counterCounts = filteredData.reduce((acc, item) => {
          const counterName = item.CounterName || item.Counter || 'Unassigned';
          acc[counterName] = (acc[counterName] || 0) + 1;
          return acc;
        }, {});
        const sortedCounters = Object.entries(counterCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8);
        const maxCount = sortedCounters.length > 0 ? Math.max(...sortedCounters.map(([,count]) => count)) : 0;
        return sortedCounters.map(([name, count], idx) => [
          idx+1,
          name,
          count,
          maxCount > 0 ? `${((count/maxCount)*100).toFixed(0)}%` : '0%'
        ]);
      })(),
      theme: 'striped',
      headStyles: { fillColor: [232,254,240], textColor: '#22c55e', fontStyle: 'bold', fontSize: 12 },
      bodyStyles: { fontSize: 11, font: 'helvetica', textColor: '#232a36' },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { left: 40, right: 40 },
      styles: { cellPadding: 6, overflow: 'linebreak' },
    });
    y = doc.lastAutoTable.finalY + 32;

    // Performance Metrics
    doc.setFillColor(255, 249, 196); // very light gold
    doc.roundedRect(40, y, pageWidth-80, 32, 8, 8, 'F');
    doc.setFontSize(16);
    doc.setTextColor('#bfa100');
    doc.text(t('analytics.performanceMetrics'), pageWidth/2, y+22, { align: 'center' });
    y += 48;
    autoTable(doc, {
      startY: y,
      head: [[t('analytics.categoryName'), t('analytics.count'), t('analytics.percentage'), t('analytics.status')]],
      body: [
        [
          t('analytics.goldItems'),
          filteredData.filter(item => item.CategoryName === 'GOLD').length,
          `${((filteredData.filter(item => item.CategoryName === 'GOLD').length / filteredData.length) * 100).toFixed(1)}%`,
          t('analytics.statusActive')
        ],
        [
          t('analytics.soldItems'),
          filteredData.filter(item => item.Status === 'Sold').length,
          `${((filteredData.filter(item => item.Status === 'Sold').length / filteredData.length) * 100).toFixed(1)}%`,
          t('analytics.statusSold')
        ],
        [
          t('analytics.activeItems'),
          filteredData.filter(item => item.Status !== 'Sold').length,
          `${((filteredData.filter(item => item.Status !== 'Sold').length / filteredData.length) * 100).toFixed(1)}%`,
          t('analytics.statusAvailable')
        ],
      ],
      theme: 'striped',
      headStyles: { fillColor: [255,249,196], textColor: '#bfa100', fontStyle: 'bold', fontSize: 12 },
      bodyStyles: { fontSize: 11, font: 'helvetica', textColor: '#232a36' },
      alternateRowStyles: { fillColor: [248,250,252] },
      margin: { left: 40, right: 40 },
      styles: { cellPadding: 6, overflow: 'linebreak' },
    });

    // Save PDF
    doc.save('RFID_Analytics_Report.pdf');
  };

  // 3. Replace Performance Metrics table with Recent Activity table
  // Add a function to get recent activity (mocked for now)
  const getRecentActivity = () => {
    // Mocked recent activity data for demonstration
    return [
      { date: '2024-06-01', action: 'Added', item: 'Gold Ring', user: 'Admin', result: 'Success' },
      { date: '2024-06-01', action: 'Sold', item: 'Silver Chain', user: 'User1', result: 'Success' },
      { date: '2024-05-30', action: 'Transferred', item: 'Platinum Coin', user: 'Admin', result: 'Success' },
      { date: '2024-05-29', action: 'Added', item: 'Diamond Pendant', user: 'User2', result: 'Success' },
      { date: '2024-05-28', action: 'Sold', item: 'Gold Bracelet', user: 'User3', result: 'Success' },
    ];
  };

  // Pagination component
  const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange, tableType }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((page) =>
      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
    );

    return (
      <div className="pagination-container">
        <div className="pagination-controls">
          <button 
            className="pagination-btn" 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          {visiblePages.map((page, index) => (
            <React.Fragment key={page}>
              {index > 0 && visiblePages[index - 1] !== page - 1 ? (
                <span className="pagination-ellipsis">...</span>
              ) : null}
              <button
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            </React.Fragment>
          ))}
          <button 
            className="pagination-btn" 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
          <span className="pagination-mini-info">
            {currentPage}/{totalPages}
          </span>
        </div>
      </div>
    );
  };

  // Category Performance Analysis function
  const getCategoryPerformanceAnalysis = () => {
    const categoryAnalysis = {};
    
    filteredData.forEach(item => {
      const category = item.CategoryName;
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          totalItems: 0,
          totalWeight: 0,
          totalValue: 0,
          products: {},
          soldItems: 0
        };
      }
      
      categoryAnalysis[category].totalItems += 1;
      categoryAnalysis[category].totalWeight += parseFloat(item.GrossWt) || 0;
      categoryAnalysis[category].totalValue += (parseFloat(item.TodaysRate) * parseFloat(item.GrossWt)) || 0;
      
      if (item.Status === 'Sold') {
        categoryAnalysis[category].soldItems += 1;
      }
      
      // Track products in this category
      if (!categoryAnalysis[category].products[item.ProductName]) {
        categoryAnalysis[category].products[item.ProductName] = 0;
      }
      categoryAnalysis[category].products[item.ProductName] += 1;
    });

    return Object.entries(categoryAnalysis).map(([category, data]) => {
      const topProduct = Object.entries(data.products)
        .sort(([,a], [,b]) => b - a)[0];
      
      const conversionRate = ((data.soldItems / data.totalItems) * 100).toFixed(1);
      const avgValue = data.totalItems > 0 ? (data.totalValue / data.totalItems).toFixed(0) : 0;
      
      return {
        category,
        totalItems: data.totalItems,
        totalWeight: data.totalWeight.toFixed(2),
        avgValue: `₹${parseInt(avgValue).toLocaleString()}`,
        topProduct: topProduct ? topProduct[0] : 'N/A',
        trend: conversionRate,
        trendClass: conversionRate > 50 ? 'trend-high' : conversionRate > 25 ? 'trend-medium' : 'trend-low'
      };
    }).sort((a, b) => b.totalItems - a.totalItems);
  };

  // Handle chart segment clicks
  const handleChartClick = (event, elements, chartType) => {
    if (elements.length > 0) {
      const elementIndex = elements[0].index;
      let selectedData = {};
      
      if (chartType === 'status') {
        const statusCounts = filteredData.reduce((acc, item) => {
          acc[item.Status] = (acc[item.Status] || 0) + 1;
          return acc;
        }, {});
        const statusLabels = Object.keys(statusCounts);
        const selectedStatus = statusLabels[elementIndex];
        const statusItems = filteredData.filter(item => item.Status === selectedStatus);
        
        selectedData = {
          type: 'status',
          title: selectedStatus,
          color: getStatusColor(selectedStatus),
          icon: getStatusIcon(selectedStatus),
          totalItems: statusItems.length,
          percentage: ((statusItems.length / filteredData.length) * 100).toFixed(1),
          items: statusItems,
          breakdown: getStatusBreakdown(statusItems)
        };
      } else if (chartType === 'category') {
        const categoryCounts = filteredData.reduce((acc, item) => {
          acc[item.CategoryName] = (acc[item.CategoryName] || 0) + 1;
          return acc;
        }, {});
        const categoryLabels = Object.keys(categoryCounts);
        const selectedCategory = categoryLabels[elementIndex];
        const categoryItems = filteredData.filter(item => item.CategoryName === selectedCategory);
        
        selectedData = {
          type: 'category',
          title: selectedCategory,
          color: categoryColorPalette[elementIndex % categoryColorPalette.length],
          icon: getCategoryIcon(selectedCategory),
          totalItems: categoryItems.length,
          percentage: ((categoryItems.length / filteredData.length) * 100).toFixed(1),
          items: categoryItems,
          breakdown: getCategoryBreakdown(categoryItems)
        };
      } else if (chartType === 'branch') {
        const branchCounts = filteredData.reduce((acc, item) => {
          acc[item.BranchName] = (acc[item.BranchName] || 0) + 1;
          return acc;
        }, {});
        const branchLabels = Object.keys(branchCounts);
        const selectedBranch = event?.chart?.data?.labels?.[elementIndex] || branchLabels[elementIndex];
        const branchItems = filteredData.filter(item => item.BranchName === selectedBranch);
        
        selectedData = {
          type: 'branch',
          title: selectedBranch,
          color: branchColorPalette[elementIndex % branchColorPalette.length],
          icon: getBranchIcon(selectedBranch),
          totalItems: branchItems.length,
          percentage: ((branchItems.length / filteredData.length) * 100).toFixed(1),
          items: branchItems,
          breakdown: getBranchBreakdown(branchItems)
        };
      }
      
      setSelectedAnalytics(selectedData);
      setShowAnalyticsModal(true);
    }
  };

  // Helper functions for icons and colors
  const getStatusColor = (status) => {
    const colors = { 'Active': '#22c55e', 'Sold': '#ef4444', 'Inactive': '#64748b', 'Pending': '#0077d4' };
    return colors[status] || '#0077d4';
  };

  const getStatusIcon = (status) => {
    const icons = { 'Active': '✅', 'Sold': '💰', 'Inactive': '⏸️', 'Pending': '⏳' };
    return icons[status] || '📊';
  };

  const getCategoryIcon = (category) => {
    const icons = { 'GOLD': '🥇', 'SILVER': '🥈', 'PLATINUM': '💎', 'DIAMOND': '💍' };
    return icons[category] || '📦';
  };

  const getBranchIcon = (branch) => {
    return '🏢';
  };

  const getVendorAvatarColor = (vendorName, index) => {
    const vendorColors = [
      '#0077d4', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', 
      '#f472b6', '#a3e635', '#fbbf24', '#6366f1', '#0ea5e9', '#b3b3cc'
    ];
    return vendorColors[index % vendorColors.length];
  };

  const getVendorIcon = (vendorName) => {
    return '🏪';
  };

  const getProductIcon = (productName) => {
    return '📦';
  };

  // Breakdown functions
  const getStatusBreakdown = (items) => {
    const categoryBreakdown = items.reduce((acc, item) => {
      acc[item.CategoryName] = (acc[item.CategoryName] || 0) + 1;
      return acc;
    }, {});
    
    const topProducts = items.reduce((acc, item) => {
      acc[item.ProductName] = (acc[item.ProductName] || 0) + 1;
      return acc;
    }, {});
    
    return {
      byCategory: Object.entries(categoryBreakdown).sort(([,a], [,b]) => b - a).slice(0, 5),
      topProducts: Object.entries(topProducts).sort(([,a], [,b]) => b - a).slice(0, 5),
      totalWeight: items.reduce((sum, item) => sum + (parseFloat(item.GrossWt) || 0), 0).toFixed(2),
      totalValue: items.reduce((sum, item) => sum + (parseFloat(item.TodaysRate) * parseFloat(item.GrossWt) || 0), 0).toFixed(0)
    };
  };

  const getCategoryBreakdown = (items) => {
    const statusBreakdown = items.reduce((acc, item) => {
      acc[item.Status] = (acc[item.Status] || 0) + 1;
      return acc;
    }, {});
    
    const counterBreakdown = items.reduce((acc, item) => {
      const counterName = item.CounterName || item.Counter || 'Unassigned';
      acc[counterName] = (acc[counterName] || 0) + 1;
      return acc;
    }, {});
    
    return {
      byStatus: Object.entries(statusBreakdown).sort(([,a], [,b]) => b - a).slice(0, 5),
      topCounters: Object.entries(counterBreakdown).sort(([,a], [,b]) => b - a).slice(0, 5),
      totalWeight: items.reduce((sum, item) => sum + (parseFloat(item.GrossWt) || 0), 0).toFixed(2),
      totalValue: items.reduce((sum, item) => sum + (parseFloat(item.TodaysRate) * parseFloat(item.GrossWt) || 0), 0).toFixed(0)
    };
  };

  const getBranchBreakdown = (items) => {
    const categoryBreakdown = items.reduce((acc, item) => {
      acc[item.CategoryName] = (acc[item.CategoryName] || 0) + 1;
      return acc;
    }, {});
    
    const statusBreakdown = items.reduce((acc, item) => {
      acc[item.Status] = (acc[item.Status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      byCategory: Object.entries(categoryBreakdown).sort(([,a], [,b]) => b - a).slice(0, 5),
      byStatus: Object.entries(statusBreakdown).sort(([,a], [,b]) => b - a).slice(0, 5),
      totalWeight: items.reduce((sum, item) => sum + (parseFloat(item.GrossWt) || 0), 0).toFixed(2),
      totalValue: items.reduce((sum, item) => sum + (parseFloat(item.TodaysRate) * parseFloat(item.GrossWt) || 0), 0).toFixed(0)
    };
  };

  // Analytics Modal Component
  const AnalyticsModal = ({ data, onClose }) => {
    if (!data) return null;
    
    return (
      <div className="analytics-modal-overlay" onClick={onClose}>
        <div className="analytics-modal-content" onClick={e => e.stopPropagation()}>
          <div className="analytics-modal-header">
            <div className="analytics-modal-title">
              <span className="analytics-modal-icon" style={{ color: data.color }}>
                {data.icon}
              </span>
              <div>
                <h2>{data.title} Analytics</h2>
                <p>{data.type.charAt(0).toUpperCase() + data.type.slice(1)} {t('analytics.modal.title')}</p>
              </div>
            </div>
            <button className="analytics-modal-close" onClick={onClose}>×</button>
          </div>
          
          <div className="analytics-modal-body">
            {/* Key Metrics */}
            <div className="analytics-metrics-grid">
              <div className="analytics-metric-card">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <h3>{data.totalItems.toLocaleString()}</h3>
                  <p>{t('analytics.totalItems')}</p>
                </div>
              </div>
              <div className="analytics-metric-card">
                <div className="metric-icon">📈</div>
                <div className="metric-content">
                  <h3>{data.percentage}%</h3>
                  <p>{t('analytics.share')}</p>
                </div>
              </div>
              <div className="analytics-metric-card">
                <div className="metric-icon">⚖️</div>
                <div className="metric-content">
                  <h3>{data.breakdown.totalWeight}g</h3>
                  <p>{t('analytics.modal.totalWeight')}</p>
                </div>
              </div>
              <div className="analytics-metric-card">
                <div className="metric-icon">💰</div>
                <div className="metric-content">
                  <h3>₹{parseInt(data.breakdown.totalValue).toLocaleString()}</h3>
                  <p>{t('analytics.modal.totalValue')}</p>
                </div>
              </div>
            </div>
            
            {/* Breakdown Tables */}
            <div className="analytics-breakdown-grid">
              <div className="breakdown-section">
                <h4>{data.type === 'status' ? t('analytics.byCategory') : data.type === 'category' ? t('analytics.byStatus') : t('analytics.byCategory')}</h4>
                <div className="breakdown-list">
                  {(data.type === 'status' ? data.breakdown.byCategory : 
                    data.type === 'category' ? data.breakdown.byStatus : 
                    data.breakdown.byCategory).map(([name, count], idx) => (
                    <div key={name} className="breakdown-item">
                      <span className="breakdown-name">{name}</span>
                      <span className="breakdown-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="breakdown-section">
                <h4>{data.type === 'status' ? t('analytics.modal.topItems') : data.type === 'category' ? 'Number of Counters' : t('analytics.byStatus')}</h4>
                <div className="breakdown-list">
                  {(data.type === 'status' ? data.breakdown.topProducts : 
                    data.type === 'category' ? data.breakdown.topCounters : 
                    data.breakdown.byStatus).map(([name, count], idx) => (
                    <div key={name} className="breakdown-item">
                      <span className="breakdown-name">{name.length > 20 ? name.substring(0, 20) + '...' : name}</span>
                      <span className="breakdown-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="analytics-modal-footer">
            <button className="analytics-export-btn">
              <FaDownload /> {t('analytics.modal.export')}
            </button>
            <button className="analytics-close-btn" onClick={onClose}>
              {t('analytics.modal.close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update chart options to include click handlers
  const chartOptionsWithClick = {
    ...chartOptions,
    onClick: (event, elements) => handleChartClick(event, elements, 'status'),
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: (context) => {
            const label = context.label || 'Status';
            const count = context.parsed?.y ?? context.raw ?? 0;
            return `${label}: ${count.toLocaleString()} items`;
          },
          afterLabel: () => 'Click to view details'
        }
      }
    },
    elements: {
      bar: {
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff',
        borderRadius: 10
      }
    },
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        grid: { display: false },
        ticks: {
          ...chartOptions.scales.x.ticks,
          padding: 8
        }
      },
      y: {
        ...chartOptions.scales.y,
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
        ticks: {
          ...chartOptions.scales.y.ticks,
          padding: 6
        }
      }
    }
  };

  const categoryChartOptions = {
    ...chartOptions,
    onClick: (event, elements) => handleChartClick(event, elements, 'category'),
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          afterLabel: () => 'Click to view details'
        }
      }
    },
    elements: {
      arc: {
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff'
      }
    }
  };

  const pieChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          font: {
            size: 11,
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          },
          color: '#6b7280',
          usePointStyle: true,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3b82f6',
        borderWidth: 1,
        cornerRadius: 6,
        titleFont: {
          size: 12,
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        bodyFont: {
          size: 11,
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      }
    }
  };

  const branchChartOptions = {
    ...pieChartOptions,
    onClick: (event, elements) => handleChartClick(event, elements, 'branch'),
    plugins: {
      ...pieChartOptions.plugins,
      legend: {
        display: false
      },
      tooltip: {
        ...pieChartOptions.plugins.tooltip,
        callbacks: {
          label: (context) => {
            const branch = context.label || 'Branch';
            const value = context.parsed ?? context.raw ?? 0;
            const total = (context.dataset?.data || []).reduce((sum, num) => sum + (Number(num) || 0), 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${branch}: ${value.toLocaleString()} (${pct}%)`;
          },
          afterLabel: () => 'Hover to view branch details'
        }
      }
    },
    elements: {
      arc: {
        borderRadius: 4,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff'
      }
    }
  };

  // Animated number component for counting effect
  const AnimatedNumber = ({ value, suffix = '', decimals = 0 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const animationRef = React.useRef(null);
    const previousLoadingRef = React.useRef(loading);
    const hasAnimatedRef = React.useRef(false);
    const previousValueRef = React.useRef(null);
    const startValueRef = React.useRef(0);
    
    useEffect(() => {
      const target = parseFloat(value) || 0;
      const prevValue = previousValueRef.current;
      const prevLoading = previousLoadingRef.current;
      
      // Clear any existing animation first
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      
      if (loading) {
        // During loading, show animated dummy values
        // Reset animation flag when loading starts
        if (!prevLoading) {
          hasAnimatedRef.current = false;
        }
        previousLoadingRef.current = true;
        startValueRef.current = displayValue;
        
        animationRef.current = setInterval(() => {
          setDisplayValue(prev => {
            const variation = target * 0.1; // 10% variation
            const newValue = target - variation + Math.random() * (variation * 2);
            return Math.max(0, newValue);
          });
        }, 200);
      } else {
        // Loading completed - only animate if:
        // 1. We were loading before (prevLoading === true)
        // 2. We haven't animated yet for this value
        // 3. The value has actually changed or is different from previous
        const wasLoading = prevLoading;
        const valueChanged = prevValue === null || prevValue !== target;
        
        // Only animate once when loading completes and value has changed
        // Only animate if:
        // 1. We were loading before (transition from loading to not loading)
        // 2. We haven't animated yet
        // 3. The target value is meaningful (> 0)
        // 4. The value is different from what we've animated to before
        if (wasLoading && !hasAnimatedRef.current && target > 0) {
          // Mark as animated immediately to prevent double animation
          hasAnimatedRef.current = true;
          previousLoadingRef.current = false;
          previousValueRef.current = target;
          
          const startValue = displayValue || 0;
          startValueRef.current = startValue;
          const duration = 1500;
          const steps = 60;
          const totalChange = target - startValue;
          
          // Only animate if there's a significant change
          if (Math.abs(totalChange) > 0.01) {
            const increment = totalChange / steps;
            let step = 0;
            
            animationRef.current = setInterval(() => {
              step++;
              const newCurrent = startValue + (increment * step);
              
              if ((increment >= 0 && newCurrent >= target) || (increment < 0 && newCurrent <= target)) {
                setDisplayValue(target);
                if (animationRef.current) {
                  clearInterval(animationRef.current);
                  animationRef.current = null;
                }
              } else {
                setDisplayValue(increment >= 0 ? Math.floor(newCurrent) : Math.ceil(newCurrent));
              }
            }, duration / steps);
          } else {
            // If change is too small, just set directly
            setDisplayValue(target);
          }
        } else if (!loading && !wasLoading && valueChanged && target > 0) {
          // Value changed after initial load (e.g., filter change) - update without animation
          setDisplayValue(target);
          previousValueRef.current = target;
        } else if (!loading && !hasAnimatedRef.current && target === 0) {
          // Edge case: loading finished but value is 0 - just set it
          setDisplayValue(0);
          previousValueRef.current = 0;
        }
      }
      
      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
      };
    }, [value, loading]);
    
    return <span>{displayValue.toFixed(decimals).toLocaleString()}{suffix}</span>;
  };

  if (error) {
    return (
      <div className="analytics-error">
        <div className="error-content">
          <FaChartLine size={48} color="#ef4444" />
          <p>{error}</p>
          <button onClick={fetchAnalyticsData} className="retry-btn">
            <FaSyncAlt /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="dashboard-container dashboard-analytics-responsive"
      style={{
        padding: '12px',
        background: '#ffffff',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        opacity: loading ? 0.85 : 1,
        transition: 'opacity 0.3s ease',
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      <style>{`
        .dashboard-analytics-responsive { box-sizing: border-box; }
        @media (max-width: 1400px) {
          .metrics-cards-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .charts-grid-responsive { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 992px) {
          .dashboard-analytics-responsive { padding: 12px !important; }
          .metrics-cards-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .charts-grid-responsive { grid-template-columns: 1fr !important; gap: 12px !important; }
        }
        @media (max-width: 576px) {
          .dashboard-analytics-responsive { padding: 8px !important; }
          .metrics-cards-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .charts-grid-responsive { grid-template-columns: 1fr !important; gap: 10px !important; }
        }
        .charts-grid-responsive > div { min-width: 0; }
        .metrics-cards-grid > div { min-width: 0; }
        .dashboard-analytics-responsive { padding-bottom: 24px !important; }
        @media (max-width: 992px) {
          .bottom-tables-grid { grid-template-columns: 1fr !important; gap: 12px !important; margin-bottom: 16px !important; }
        }
        @media (max-width: 576px) {
          .bottom-tables-grid { gap: 10px !important; margin-bottom: 12px !important; }
        }
      `}</style>
      {/* Loading Progress Indicator */}
      {loading && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          marginBottom: '16px',
          background: 'white',
          borderRadius: '8px',
          padding: '12px 16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid #e3e8ef',
                borderTop: '3px solid #0077d4',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827'
              }}>
                {t('analytics.loadingData')}...
              </span>
            </div>
            <span style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#0077d4',
              fontFamily: 'monospace'
            }}>
              {Math.round(loadingProgress)}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0077d4, #3b82f6)',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 10px rgba(0, 119, 212, 0.5)'
            }} />
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Header Row: SparkleRFID Dashboard + Rates */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 240,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0d9488 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(13,148,136,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <FaCoins size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              SparkleRFID Dashboard
            </div>
          
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenRates}
          disabled={ratesLoading || ratesSaving}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 800,
            color: '#fff',
            background: ratesSaving ? '#94a3b8' : '#0d9488',
            border: 'none',
            borderRadius: 12,
            cursor: ratesLoading || ratesSaving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 10px 26px rgba(13,148,136,0.18)',
          }}
        >
          {ratesLoading ? <FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> : <FaCoins />}
          Rates
        </button>
      </div>

      {/* Rates Modal */}
      {ratesModalOpen && (
        <div
          // Do not close on overlay click; Close button only.
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 12px',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(760px, 92vw)',
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #e5e7eb',
              boxShadow: '0 30px 90px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              maxHeight: 'calc(100vh - 140px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #e5e7eb',
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    background: '#0d94880f',
                    border: '1px solid #0d948830',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0d9488',
                    flexShrink: 0,
                  }}
                >
                  <FaCoins size={13} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Set Rates</div>
                  <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600 }}>Edit Today&apos;s Rate</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setRatesModalOpen(false)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                  disabled={ratesSaving}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ padding: '4px 8px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {ratesLoading ? (
                <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontWeight: 700 }}>
                  <FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> Loading rates...
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 10,
                      minWidth: 520,
                      tableLayout: 'fixed',
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '5px 7px',
                            borderBottom: '1px solid #e5e7eb',
                            color: '#5b6776',
                            fontWeight: 900,
                            width: '42%',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                          }}
                        >
                          Category
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '5px 7px',
                            borderBottom: '1px solid #e5e7eb',
                            color: '#5b6776',
                            fontWeight: 900,
                            width: '38%',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                          }}
                        >
                          Purity
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: '5px 7px',
                            borderBottom: '1px solid #e5e7eb',
                            color: '#5b6776',
                            fontWeight: 900,
                            width: '20%',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                          }}
                        >
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {puritiesMaster.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '10px 10px', color: '#64748b', fontWeight: 700 }}>
                            No purity data found
                          </td>
                        </tr>
                      ) : (
                        puritiesMaster
                          .slice()
                          .sort((a, b) => {
                            const catA = Number(a.CategoryId ?? a.categoryId ?? -1) || 0;
                            const catB = Number(b.CategoryId ?? b.categoryId ?? -1) || 0;
                            if (catA !== catB) return catA - catB;
                            const purityA = Number(a.Id ?? a.id ?? a.PurityId ?? a.PurityID ?? 0) || 0;
                            const purityB = Number(b.Id ?? b.id ?? b.PurityId ?? b.PurityID ?? 0) || 0;
                            return purityA - purityB;
                          })
                          .map((p, idx) => {
                            const purityId = p.Id ?? p.id ?? p.PurityId ?? p.PurityID ?? '';
                            const categoryId = p.CategoryId ?? p.categoryId ?? '';
                            const catKey = categoryId !== '' && categoryId != null ? String(categoryId) : '';
                            const purityKey = purityId !== '' && purityId != null ? String(purityId) : '';

                            const catName = getCategoryNameForPurity(p);
                            const purityName = p.PurityName ?? p.Name ?? '';
                            const value = ratesByPurityId[purityKey] ?? '';

                            return (
                              <tr
                                key={String(purityId)}
                                style={{
                                  borderBottom: '1px solid #eef2f6',
                                  background: idx % 2 === 0 ? '#ffffff' : '#fcfdff',
                                }}
                              >
                                <td
                                  style={{
                                    padding: '4px 7px',
                                    fontWeight: 900,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    background: 'transparent',
                                  }}
                                >
                                  {catName}
                                </td>
                                <td
                                  style={{
                                    padding: '4px 7px',
                                    fontWeight: 900,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {purityName}
                                </td>
                                <td style={{ padding: '4px 7px', textAlign: 'right' }}>
                                  <input
                                    type="text"
                                    value={value === '' || value == null ? '' : String(value)}
                                    onChange={(e) => handleRateChange(p, e.target.value)}
                                  disabled={ratesSaving}
                                    style={{
                                      width: 145,
                                      height: 28,
                                      padding: '4px 8px',
                                      borderRadius: 9,
                                      border: '1px solid #e2e8f0',
                                      outline: 'none',
                                      fontWeight: 800,
                                      textAlign: 'right',
                                      fontSize: 10.5,
                                      boxSizing: 'border-box',
                                    background: ratesSaving ? '#f1f5f9' : '#fff',
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '8px 10px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                {dailyRatesChangedCount > 0 ? `${dailyRatesChangedCount} updated row(s)` : ''}
              </div>
              <button
                type="button"
                onClick={handleSetRates}
                disabled={ratesLoading || ratesSaving || puritiesMaster.length === 0 || dailyRatesChangedCount === 0}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#fff',
                  background: ratesSaving ? '#94a3b8' : '#6366f1',
                  border: 'none',
                  borderRadius: 12,
                  cursor: ratesLoading || ratesSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {ratesSaving ? <FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> : <FaCheck />}
                {ratesSaving ? 'Saving...' : 'Set Rates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Summary Cards - Responsive Grid */}
      <div 
        className="metrics-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '14px',
          marginBottom: '12px',
          width: '100%'
        }}
      >
        {[
          { 
            icon: FaGem, 
            label: t('analytics.totalItems'), 
            value: totalItems,
            suffix: '',
            decimals: 0,
            color: '#6366f1'
          },
          { 
            icon: FaWeight, 
            label: t('analytics.modal.totalWeight'), 
            value: totalWeight,
            suffix: 'g',
            decimals: 2,
            color: '#0d9488'
          },
          { 
            icon: FaTags,
            label: 'Total RFID New',
            value: totalRfidNew,
            suffix: '',
            decimals: 0,
            color: '#7c3aed'
          },
          { 
            icon: FaShoppingCart, 
            label: t('analytics.soldItems'), 
            value: soldItemsCount,
            suffix: '',
            decimals: 0,
            color: '#dc2626'
          },
          { 
            icon: FaBoxes, 
            label: t('analytics.activeItems'), 
            value: availableItems,
            suffix: '',
            decimals: 0,
            color: '#2563eb'
          },
          { 
            icon: FaBuilding, 
            label: 'No of Counter', 
            value: uniqueCounters,
            suffix: '',
            decimals: 0,
            color: '#0891b2'
          }
        ].map((card, index) => (
          <div key={index} style={{
            background: `linear-gradient(135deg, ${card.color}10 0%, #ffffff 72%)`,
            borderRadius: '16px',
            padding: '14px',
            border: `1px solid ${card.color}22`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            width: '100%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 14px 28px ${card.color}22`;
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.borderColor = `${card.color}55`;
            e.currentTarget.style.background = `linear-gradient(135deg, ${card.color}18 0%, #ffffff 72%)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = `${card.color}22`;
            e.currentTarget.style.background = `linear-gradient(135deg, ${card.color}10 0%, #ffffff 72%)`;
          }}
          >
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 2s infinite',
                pointerEvents: 'none'
              }} />
            )}
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${card.color}1A 0%, #ffffff 85%)`,
              color: card.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${card.color}2D`
            }}>
              {card.icon ? <card.icon style={{ fontSize: '20px' }} /> : null}
          </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#0f172a',
                margin: '0 0 6px 0',
                lineHeight: '1.2',
                letterSpacing: '-0.02em'
              }}>
                {card.prefix || ''}
                <AnimatedNumber 
                  value={card.value} 
                  suffix={card.suffix} 
                  decimals={card.decimals}
                />
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#334155',
                margin: 0,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.55px'
              }}>
                {card.label}
              </p>
          </div>
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
        ))}
      </div>

      {/* Compact Charts Grid - Status, Category, Branch, Tag Usage */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '16px',
        width: '100%',
        minHeight: '300px'
      }}
      className="charts-grid-responsive"
      >
        {/* Status Distribution Chart */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 58%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.25s ease',
          minWidth: 0,
          width: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.statusDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#64748b',
                margin: 0
              }}>
                Overview of item status across inventory
              </p>
          </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#6366f118',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #6366f130'
            }}>
              <FaChartBar style={{ fontSize: '14px' }} />
          </div>
        </div>
          <div style={{ height: '210px', position: 'relative', minHeight: '210px' }}>
            <Bar data={getStatusDistribution()} options={chartOptionsWithClick} />
          </div>
          </div>

        {/* Category Distribution Chart */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f7fffc 58%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.25s ease',
          minWidth: 0,
          width: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(13, 148, 136, 0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.categoryDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#64748b',
                margin: 0
              }}>
                {t('analytics.modal.breakdown')}
              </p>
        </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#0d948818',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #0d948830'
            }}>
              <FaChartBar style={{ fontSize: '14px' }} />
          </div>
          </div>
          <div style={{ height: '210px', position: 'relative', minHeight: '210px' }}>
            {(() => {
              const { total, rings } = getCategoryRingBreakdown();
              const baseRadius = 74;
              const strokeStep = 12;
              const strokeWidth = 9;
              const circumference = (radius) => 2 * Math.PI * radius;

              return (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  {rings.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                      No category data available
                    </div>
                  ) : null}
                  {hoveredCategoryRing ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 8,
                        zIndex: 6,
                        background: '#ffffff',
                        border: `1px solid ${hoveredCategoryRing.color}55`,
                        borderRadius: 10,
                        padding: '8px 10px',
                        boxShadow: '0 8px 18px rgba(15,23,42,0.14)',
                        minWidth: 170,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: hoveredCategoryRing.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>
                          {hoveredCategoryRing.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#334155', fontWeight: 700 }}>
                        Count: {hoveredCategoryRing.count}
                      </div>
                      <div style={{ fontSize: 11, color: hoveredCategoryRing.color, fontWeight: 800 }}>
                        {hoveredCategoryRing.percentage.toFixed(1)}%
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="180" height="180" viewBox="0 0 180 180" aria-label="Category circular breakdown">
                      {rings.map((ring, idx) => {
                        const radius = baseRadius - idx * strokeStep;
                        const c = circumference(radius);
                        const dash = c * (ring.percentage / 100);
                        const gap = c - dash;
                        return (
                          <g
                            key={`ring-${ring.name}-${idx}`}
                            transform="rotate(-90 90 90)"
                            onMouseEnter={() => setHoveredCategoryRing(ring)}
                            onMouseLeave={() => setHoveredCategoryRing(null)}
                            style={{ cursor: 'pointer' }}
                          >
                            <circle
                              cx="90"
                              cy="90"
                              r={radius}
                              fill="none"
                              stroke="rgba(148,163,184,0.18)"
                              strokeWidth={strokeWidth}
                            />
                            <circle
                              cx="90"
                              cy="90"
                              r={radius}
                              fill="none"
                              stroke={ring.color}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeDasharray={`${dash} ${gap}`}
                            />
                          </g>
                        );
                      })}
                      <circle cx="90" cy="90" r="34" fill="#ffffff" />
                      <text x="90" y="84" textAnchor="middle" style={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}>
                        Total
                      </text>
                      <text x="90" y="103" textAnchor="middle" style={{ fontSize: 17, fill: '#0f172a', fontWeight: 800 }}>
                        {total}
                      </text>
                    </svg>
                  </div>
                </div>
              );
            })()}
          </div>
      </div>

        {/* Branch Distribution Chart */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff9f5 58%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.25s ease',
          minWidth: 0,
          width: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(234, 88, 12, 0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.branchDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#64748b',
                margin: 0
              }}>
                {t('analytics.chart.branchDistribution')}
              </p>
              </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#ea580c18',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ea580c30'
            }}>
              <FaChartBar style={{ fontSize: '14px' }} />
              </div>
            </div>
          <div style={{ height: '210px', position: 'relative', minHeight: '210px' }}>
                <Doughnut data={getBranchDistribution()} options={branchChartOptions} />
            </div>
          </div>

        {/* Tag Usage Distribution Chart */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #faf7ff 58%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.25s ease',
          minWidth: 0,
          width: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 58, 237, 0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#0f172a',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.tagUsageDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#64748b',
                margin: 0
              }}>
                {t('analytics.chart.tagUsageDistribution')}
              </p>
        </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#7c3aed18',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #7c3aed30'
            }}>
              <FaChartBar style={{ fontSize: '14px' }} />
            </div>
          </div>
          <div style={{ height: '210px', position: 'relative', minHeight: '210px' }}>
              {tagUsageLoading && !loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.9)',
                zIndex: 10,
                color: '#6b7280'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '8px'
                }} />
                <p style={{ fontSize: '12px', margin: 0 }}>Loading...</p>
                </div>
              )}
                <Bar 
                  data={getTagUsageDistribution()} 
                  options={{
                    ...chartOptions,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        position: 'bottom',
                        labels: {
                        padding: 12,
                          font: {
                          size: 10,
                          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 6,
                        titleFont: {
                          size: 11,
                          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        },
                        bodyFont: {
                          size: 10,
                          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        },
                        callbacks: {
                          label: (ctx) => `${ctx.label}: ${(ctx.raw || 0).toLocaleString()}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                          font: {
                            size: 9,
                            family: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }
                        }
                      },
                      x: {
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                          display: false
                        }
                      }
                    }
                  }} 
                />
            </div>
          </div>
      </div>

      {/* Compact Bottom Sections - Top Items, Counter Wise, Category */}
      <div 
        className="bottom-tables-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '16px'
        }}
      >
        {/* Top Products */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 58%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0
            }}>
              {t('analytics.modal.topItems')}
            </h3>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
                <input
                  type="text"
                  placeholder={t('analytics.searchProducts')}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '11px',
                  color: '#374151',
                  width: '120px'
                }}
                />
              </div>
            </div>
          
          <div className="analytics-table-scroll" style={{ maxHeight: '180px', overflowY: 'hidden', overflowX: 'hidden', minWidth: 0 }}>
            <table className="analytics-bottom-table" style={{
              width: '100%',
              minWidth: '0',
              borderCollapse: 'collapse',
              fontSize: '12px',
              tableLayout: 'auto',
              fontFamily: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}>
                <thead>
                <tr style={{
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8fafc'
                }}>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '44px'
                  }}>Sr.No</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '100px'
                  }}>Product</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '86px'
                  }}>Category</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '80px'
                  }}>Design</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '56px'
                  }}>Qty</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '70px'
                  }}>Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                  const groupedItems = data.reduce((acc, item) => {
                      const product = item.ProductName || '-';
                      const category = item.CategoryName || '-';
                      const design = item.DesignName || item.DesignNo || item.Design || '-';
                      const key = `${product}||${category}||${design}`;
                      if (!acc[key]) {
                        acc[key] = { product, category, design, qty: 0 };
                      }
                      acc[key].qty += 1;
                      return acc;
                    }, {});
                    
                    const filteredRows = Object.values(groupedItems).filter((row) =>
                      row.product.toLowerCase().includes(productSearch.toLowerCase()) ||
                      row.category.toLowerCase().includes(productSearch.toLowerCase()) ||
                      row.design.toLowerCase().includes(productSearch.toLowerCase())
                    );
                    
                    const sortedRows = filteredRows.sort((a, b) => b.qty - a.qty);
                    const totalQty = filteredRows.reduce((sum, row) => sum + row.qty, 0);
                    
                    const startIndex = (productPage - 1) * itemsPerPage;
                    const paginatedRows = sortedRows.slice(startIndex, startIndex + itemsPerPage);
                    
                    return (
                      <>
                        {paginatedRows.map((row, index) => (
                        <tr key={`${row.product}-${row.category}-${row.design}-${index}`} style={{
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          <td style={{
                            padding: '8px',
                            color: '#6b7280',
                            fontSize: '11px'
                          }}>{startIndex + index + 1}</td>
                          <td style={{ padding: '8px', fontSize: '11px', fontWeight: '600', color: '#111827' }}>
                            {row.product}
                          </td>
                          <td style={{
                            padding: '8px',
                            fontSize: '11px',
                            color: '#334155'
                          }}>
                            {row.category}
                          </td>
                          <td style={{
                            padding: '8px',
                            fontSize: '11px',
                            color: '#334155'
                          }}>
                            {row.design}
                          </td>
                          <td style={{ padding: '8px', fontSize: '11px', fontWeight: '700', color: '#111827', textAlign: 'right' }}>
                            {row.qty.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', fontSize: '11px', fontWeight: '700', color: '#334155', textAlign: 'right' }}>
                            {totalQty > 0 ? ((row.qty / totalQty) * 100).toFixed(1) : '0.0'}%
                          </td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
          </div>
          <PaginationControls
            currentPage={productPage}
            totalItems={topItemsTotalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setProductPage}
            tableType="product"
          />
        </div>

        {/* Counter Wise Stock */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f7fffc 58%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0
            }}>
              Counter Wise Stock
            </h3>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
                <input
                  type="text"
                  placeholder={t('analytics.searchCounters')}
                  value={counterSearch}
                  onChange={(e) => setCounterSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '11px',
                  color: '#374151',
                  width: '120px'
                }}
                />
              </div>
            </div>
          
          <div className="analytics-table-scroll" style={{ maxHeight: '180px', overflowY: 'hidden', overflowX: 'hidden', minWidth: 0 }}>
            <table className="analytics-bottom-table" style={{
              width: '100%',
              minWidth: '0',
              borderCollapse: 'collapse',
              fontSize: '12px',
              tableLayout: 'auto',
              fontFamily: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}>
                <thead>
                <tr style={{
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8fafc'
                }}>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '44px'
                  }}>Sr.No</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '100px'
                  }}>{t('analytics.counterName')}</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '56px'
                  }}>Qty</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minWidth: '90px'
                  }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                  const counterCounts = filteredData.reduce((acc, item) => {
                    const counterName = item.CounterName || item.Counter || 'Unassigned';
                    acc[counterName] = (acc[counterName] || 0) + 1;
                      return acc;
                    }, {});
                    
                    const filteredCounterCounts = Object.entries(counterCounts)
                      .filter(([name]) => name && name.toLowerCase().includes(counterSearch.toLowerCase()));
                    
                    const sortedCounters = filteredCounterCounts
                      .sort(([,a], [,b]) => b - a);
                    const maxCount = filteredCounterCounts.length > 0 ? Math.max(...filteredCounterCounts.map(([,count]) => count)) : 0;
                    
                    const startIndex = (counterPage - 1) * itemsPerPage;
                    const paginatedCounters = sortedCounters.slice(startIndex, startIndex + itemsPerPage);
                    
                    return (
                      <>
                        {paginatedCounters.map(([name, count], index) => (
                        <tr key={name} style={{
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          <td style={{
                            padding: '8px',
                            color: '#6b7280',
                            fontSize: '11px'
                          }}>{startIndex + index + 1}</td>
                          <td style={{
                            padding: '8px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '500',
                              color: '#111827',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {name || 'Unknown'}
                            </div>
                          </td>
                          <td style={{
                            padding: '8px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#111827',
                            textAlign: 'right'
                          }}>
                            {count.toLocaleString()}
                            </td>
                          <td style={{
                            padding: '8px',
                            fontSize: '11px',
                            color: '#6b7280',
                            textAlign: 'right',
                            fontWeight: '600'
                          }}>
                            {maxCount > 0 ? ((count / maxCount) * 100).toFixed(0) : 0}%
                          </td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
          </div>
          <PaginationControls
            currentPage={counterPage}
            totalItems={counterWiseTotalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setCounterPage}
            tableType="counter"
          />
        </div>

        {/* Category Performance Analysis */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fffaf5 58%, #f8fafc 100%)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#0f172a',
              margin: 0
            }}>
              {t('analytics.chart.categoryDistribution')}
            </h3>
          </div>
          
          <div className="analytics-table-scroll" style={{ maxHeight: '180px', overflowY: 'hidden', overflowX: 'hidden', minWidth: 0 }}>
            <table className="analytics-bottom-table" style={{
              width: '100%',
              minWidth: '0',
              borderCollapse: 'collapse',
              fontSize: '11px',
              tableLayout: 'auto',
              fontFamily: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}>
                <thead>
                <tr style={{
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8fafc'
                }}>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    minWidth: '44px'
                  }}>Sr.No</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    minWidth: '90px'
                  }}>Category</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    minWidth: '56px'
                  }}>Qty</th>
                  <th style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: '#334155',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    minWidth: '85px'
                  }}>Total Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const analysisData = getCategoryPerformanceAnalysis();
                    const startIndex = (categoryPage - 1) * itemsPerPage;
                    const paginatedData = analysisData.slice(startIndex, startIndex + itemsPerPage);
                    
                    return paginatedData.map((item, idx) => (
                    <tr key={item.category} style={{
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <td style={{
                        padding: '8px',
                        color: '#6b7280',
                        fontSize: '10px'
                      }}>
                        {startIndex + idx + 1}
                      </td>
                      <td style={{
                        padding: '8px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: '500', color: '#111827' }}>
                            {item.category}
                          </div>
                          </div>
                        </td>
                      <td style={{
                        padding: '8px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#111827',
                        textAlign: 'right'
                      }}>
                        {item.totalItems.toLocaleString()}
                        </td>
                      <td style={{
                        padding: '8px',
                        fontSize: '10px',
                        color: '#111827',
                        textAlign: 'right'
                      }}>
                        {item.totalWeight}g
                      </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
          </div>
          <PaginationControls
            currentPage={categoryPage}
            totalItems={categoryDistributionTotalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setCategoryPage}
            tableType="category"
          />
        </div>
      </div>

      <style>{`
        .analytics-container {
          padding: 15px;
          background: #f8fafc;
          min-height: calc(100vh - 64px);
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #0077d4, #005ea8);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
        }

        .header-content h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: -0.3px;
        }

        .header-content p {
          margin: 3px 0 0 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 400;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .export-btn,
        .refresh-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .export-btn {
          background: #22c55e;
          color: white;
        }

        .export-btn:hover {
          background: #16a34a;
        }

        .refresh-btn {
          background: #0077d4;
          color: white;
        }

        .refresh-btn:hover {
          background: #005ea8;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Additional Poppins font styling for all elements */
        .analytics-container * {
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        h1, h2, h3, h4, h5, h6 {
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 500;
        }

        .chart-title {
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 600;
        }

        .summary-card h3 {
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 600;
        }

        .summary-card p {
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 400;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        /* Responsive summary cards */
        @media (max-width: 1200px) {
          .summary-cards {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
          }
        }
        
        @media (max-width: 900px) {
          .summary-cards {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
          }
        }

        .summary-card {
          background: white;
          border-radius: 10px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
        }

        .summary-card:hover {
          transform: translateY(-2px);
        }

        .card-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
        }

        .card-icon.total {
          background: linear-gradient(135deg, #0077d4, #005ea8);
        }

        .card-icon.weight {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }

        .card-icon.value {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        .card-icon.sold {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .card-icon.available {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }

        .card-icon.vendors {
          background: linear-gradient(135deg, #06b6d4, #0891b2);
        }

        .card-content h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }

        .card-content p {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
        }

        .main-analytics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 15px;
        }

        .bottom-analytics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          align-items: stretch;
        }
        
        /* Ensure insights card is always visible and properly positioned */
        .insights-card {
          display: flex !important;
          flex-direction: column;
          height: auto;
          min-height: 280px;
        }
        
        .insights-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 15px 0;
        }
        
        .tag-usage-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 200px;
          color: #64748b;
          font-size: 12px;
        }
        
        .tag-usage-loading .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #f1f5f9;
          border-top: 2px solid #0077d4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 8px;
        }
        
        .tag-usage-loading p {
          margin: 0;
          font-size: 11px;
          color: #64748b;
        }

        .charts-section {
          display: contents;
        }

        .charts-row {
          display: contents;
        }

        .chart-card {
          background: white;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 119, 212, 0.08);
          transition: all 0.3s ease;
          min-height: 280px;
          display: flex;
          flex-direction: column;
        }

        .chart-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 119, 212, 0.15);
          border-color: rgba(0, 119, 212, 0.2);
        }

        .chart-card.compact {
          min-height: 280px;
        }
        
        /* Responsive chart card improvements */
        @media (max-width: 768px) {
          .chart-card.compact {
            min-height: 240px;
          }
        }
        
        @media (max-width: 480px) {
          .chart-card.compact {
            min-height: 200px;
          }
        }

        .chart-card.enhanced {
          height: 450px;
          background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
          border: 1px solid rgba(0, 119, 212, 0.12);
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
        }

        .chart-card.enhanced::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0077d4, #22c55e, #f59e0b, #64748b);
          background-size: 200% 100%;
          animation: gradient-shift 4s ease-in-out infinite;
          z-index: 2;
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .chart-card.enhanced:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 119, 212, 0.2);
        }

        .chart-card.enhanced .chart-header h3 {
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #0077d4, #22c55e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          letter-spacing: -0.2px;
        }

        .chart-content {
          flex: 1;
          position: relative;
          min-height: 200px;
        }

        .chart-content.compact {
          min-height: 200px;
        }

        .chart-content.enhanced,
        .table-content.enhanced {
          flex: 1;
          padding: 8px;
          display: flex;
          align-items: stretch;
          height: 360px;
        }

        .zoho-table-container {
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          border-radius: 8px;
          background: #ffffff;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f8fafc;
        }

        .zoho-table-container::-webkit-scrollbar {
          height: 6px;
        }

        .zoho-table-container::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 3px;
        }

        .zoho-table-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .zoho-table-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .zoho-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          background: white;
        }

        .zoho-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 2px solid #e2e8f0;
        }

        .zoho-table th {
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-right: 1px solid #f1f5f9;
        }

        .zoho-table th:last-child {
          border-right: none;
        }

        .table-row {
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
        }

        .table-row:hover {
          background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
          transform: translateX(2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .zoho-table td {
          padding: 10px 8px;
          vertical-align: middle;
          border-right: 1px solid #f8fafc;
        }

        .zoho-table td:last-child {
          border-right: none;
        }

        .rank-cell-simple {
          font-size: 1.01rem;
          font-weight: 600;
          color: #232a36;
          text-align: left;
          padding-left: 10px;
          padding-right: 6px;
          background: none;
          border-radius: 0;
          min-width: 32px;
        }

        .product-cell, .vendor-cell, .category-cell {
          min-width: 140px;
        }

        .product-info, .vendor-info, .category-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .product-name, .vendor-name, .category-name {
          font-weight: 500;
          color: #1e293b;
          font-size: 13px;
          line-height: 1.2;
        }

        .product-subtitle, .vendor-subtitle, .category-subtitle {
          font-size: 11px;
          color: #64748b;
          font-weight: 400;
        }

        .category-icon {
          width: 20px;
          height: 20px;
          padding: 4px;
          border-radius: 6px;
          font-size: 12px;
        }

        .category-icon.gold-icon {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .category-icon.sold-icon {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .category-icon.available-icon {
          background: rgba(0, 119, 212, 0.1);
          color: #0077d4;
        }

        .count-cell {
          text-align: center;
          width: 80px;
        }

        .count-number {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
          padding: 4px 8px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 6px;
          display: inline-block;
          min-width: 45px;
          text-align: center;
        }

        .share-cell, .performance-cell, .percentage-cell {
          width: 120px;
        }

        .share-container, .performance-container, .percentage-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .share-text, .performance-text, .percentage-text {
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          text-align: right;
        }

        .share-bar, .performance-bar, .percentage-bar {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .share-fill, .performance-fill, .percentage-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease-out;
          position: relative;
          overflow: hidden;
        }

        .share-fill {
          background: linear-gradient(90deg, #0077d4, #3b82f6);
        }

        .performance-fill.vendor-fill {
          background: linear-gradient(90deg, #22c55e, #34d399);
        }

        .percentage-fill.gold-fill {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }

        .percentage-fill.sold-fill {
          background: linear-gradient(90deg, #22c55e, #34d399);
        }

        .percentage-fill.available-fill {
          background: linear-gradient(90deg, #0077d4, #3b82f6);
        }

        .status-cell {
          text-align: center;
          width: 90px;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .status-badge.status-gold {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .status-badge.status-sold {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .status-badge.status-available {
          background: rgba(0, 119, 212, 0.1);
          color: #0369a1;
          border: 1px solid rgba(0, 119, 212, 0.2);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding: 12px 0;
          border-bottom: 2px solid #f1f5f9;
          flex-shrink: 0;
          background: rgba(248, 250, 252, 0.5);
          margin: -18px -18px 15px -18px;
          padding: 18px;
          border-radius: 12px 12px 0 0;
        }

        .chart-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .chart-icon {
          color: #0077d4;
          font-size: 18px;
          padding: 8px;
          background: rgba(0, 119, 212, 0.1);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .chart-icon:hover {
          background: rgba(0, 119, 212, 0.2);
          transform: scale(1.1);
        }

        /* Search Component Styles */
        .search-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          color: #64748b;
          font-size: 14px;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px 8px 32px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 400;
          color: #374151;
          background: white;
          transition: all 0.2s ease;
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .search-input:focus {
          outline: none;
          border-color: #0077d4;
          box-shadow: 0 0 0 3px rgba(0, 119, 212, 0.1);
          background: #fafbfc;
        }

        .search-input::placeholder {
          color: #9ca3af;
          font-weight: 400;
        }

        .insights-section {
          display: contents;
        }

        .quick-stats-card,
        .performance-card,
        .insights-card {
          background: white;
          border-radius: 12px;
          padding: 15px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 119, 212, 0.08);
          transition: all 0.3s ease;
          min-height: 280px;
          display: flex;
          flex-direction: column;
        }

        .quick-stats-card:hover,
        .performance-card:hover,
        .insights-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 119, 212, 0.15);
          border-color: rgba(0, 119, 212, 0.2);
        }

        .insights-content,
        .performance-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .insight-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f8fafc;
        }

        .insight-item:last-child {
          border-bottom: none;
        }

        .insight-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
        }

        .insight-value {
          font-size: 14px;
          font-weight: 500;
          color: #0077d4;
        }

        .performance-card {
          height: 450px;
          background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
          border: 1px solid rgba(0, 119, 212, 0.12);
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .performance-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0077d4, #22c55e, #f59e0b, #64748b);
          background-size: 200% 100%;
          animation: gradient-shift 4s ease-in-out infinite;
        }

        .performance-card .chart-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          background: linear-gradient(135deg, #0077d4, #22c55e, #f59e0b);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: text-gradient 3s ease-in-out infinite;
          margin: 0;
          letter-spacing: -0.2px;
        }

        @keyframes text-gradient {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }

        .performance-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 119, 212, 0.2);
        }

        .performance-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          padding: 20px 0;
          gap: 25px;
        }

        .perf-item {
          margin-bottom: 0;
          padding: 16px;
          background: rgba(248, 250, 252, 0.7);
          border-radius: 12px;
          border-left: 5px solid transparent;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .perf-item:hover {
          background: rgba(248, 250, 252, 0.9);
          transform: translateX(3px);
        }

        .perf-item:nth-child(1) {
          border-left-color: #f59e0b;
        }

        .perf-item:nth-child(2) {
          border-left-color: #22c55e;
        }

        .perf-item:nth-child(3) {
          border-left-color: #0077d4;
        }

        .perf-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
          color: #475569;
          margin-bottom: 8px;
        }

        .perf-count {
          color: #1e293b;
          font-weight: 600;
          font-size: 16px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .perf-bar {
          height: 12px;
          background: rgba(241, 245, 249, 0.8);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .perf-fill {
          height: 100%;
          border-radius: 8px;
          transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .perf-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 255, 255, 0.3) 100%
          );
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .perf-fill.gold {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .perf-fill.sold {
          background: linear-gradient(135deg, #22c55e 0%, #34d399 50%, #4ade80 100%);
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
        }

        .perf-fill.available {
          background: linear-gradient(135deg, #0077d4 0%, #3b82f6 50%, #60a5fa 100%);
          box-shadow: 0 2px 8px rgba(0, 119, 212, 0.3);
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }

        .stats-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .stats-icon {
          color: #0077d4;
          font-size: 16px;
        }

        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 500;
          color: #0077d4;
        }

        .performance-bars {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .performance-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .performance-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
        }

        .performance-bar {
          height: 6px;
          background: #f1f5f9;
          border-radius: 3px;
          overflow: hidden;
        }

        .performance-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #f8fafc;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .activity-details {
          flex: 1;
          min-width: 0;
        }

        .activity-title {
          font-size: 12px;
          font-weight: 500;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .activity-meta {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }

        .activity-time {
          font-size: 10px;
          color: #64748b;
          flex-shrink: 0;
        }

        .analytics-loading,
        .analytics-error {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: white;
          border-radius: 12px;
          margin: 15px;
          color: #64748b;
        }

        .loading-spinner,
        .error-content {
          text-align: center;
        }

        .loading-spinner p,
        .error-content p {
          margin: 12px 0;
          font-size: 14px;
        }

        .loading-icon {
          width: 40px;
          height: 40px;
          border: 3px solid #f1f5f9;
          border-top: 3px solid #0077d4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px auto;
        }

        .error-icon {
          font-size: 40px;
          color: #ef4444;
          margin-bottom: 15px;
        }

        .retry-btn {
          padding: 10px 20px;
          background: #0077d4;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          margin-top: 15px;
          transition: background 0.2s;
        }

        .retry-btn:hover {
          background: #005ea8;
        }

        @media (max-width: 1200px) {
          .main-analytics-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .bottom-analytics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }

          .chart-card.enhanced,
          .performance-card {
            height: 400px;
          }
          
          /* Ensure insights card spans properly */
          .insights-card {
            grid-column: span 2;
            min-height: 250px;
          }
        }

        @media (max-width: 900px) {
          .main-analytics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .bottom-analytics-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .chart-card.enhanced,
          .performance-card {
            height: 380px;
          }

          .chart-content.enhanced,
          .table-content.enhanced {
            height: 300px;
          }

          .zoho-table {
            font-size: 12px;
          }

          .zoho-table th {
            padding: 8px 6px;
            font-size: 11px;
          }

          .zoho-table td {
            padding: 8px 6px;
          }

          .product-info, .vendor-info, .category-info {
            gap: 6px;
          }

          .product-name, .vendor-name, .category-name {
            font-size: 12px;
          }
          
          /* Ensure insights card is properly sized on tablets */
          .insights-card {
            grid-column: span 1;
            min-height: 220px;
          }
          
          .insights-content {
            padding: 12px 0;
          }
        }

        @media (max-width: 768px) {
          .analytics-container {
            padding: 10px;
          }
          
          .analytics-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
            padding: 15px;
          }
          
          .header-actions {
            justify-content: center;
          }
          
          .summary-cards {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          
          .main-analytics-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .bottom-analytics-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .header-content h1 {
            font-size: 18px;
            font-weight: 600;
          }
          
          .card-content h3 {
            font-size: 16px;
            font-weight: 600;
          }
          
          .chart-card.compact,
          .chart-card.enhanced,
          .quick-stats-card,
          .performance-card,
          .insights-card {
            height: auto;
            min-height: 280px;
          }
          
          .chart-content {
            min-height: 160px;
          }
          
          .chart-content.compact {
            min-height: 160px;
          }
          
          .chart-content.enhanced,
          .table-content.enhanced {
            height: 220px;
          }

          .zoho-table {
            font-size: 11px;
          }

          .zoho-table th {
            padding: 6px 4px;
            font-size: 10px;
          }

          .zoho-table td {
            padding: 6px 4px;
          }

          .rank-cell-simple {
            font-size: 1.01rem;
            font-weight: 700;
            color: #232a36;
            text-align: left;
            padding-left: 10px;
            padding-right: 6px;
            background: none;
            border-radius: 0;
            min-width: 32px;
          }

          .performance-metrics-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            background: #f8fafc;
            border-radius: 10px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            font-size: 13px;
            margin-top: 0;
          }

          .performance-metrics-table th, .performance-metrics-table td {
            font-size: 12px;
            padding: 8px 8px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            background: none;
          }

          .performance-metrics-table th {
            font-weight: 700;
            color: #334155;
            background: #f1f5f9;
            border-bottom: 2px solid #e5e7eb;
          }

          .performance-metrics-table tr:last-child td {
            border-bottom: none;
          }

          .performance-metrics-table .category-cell {
            font-weight: 600;
            color: #232a36;
            font-size: 12px;
            min-width: 120px;
          }

          .performance-metrics-table .category-subtitle {
            font-size: 11px;
            color: #64748b;
            font-weight: 400;
            margin-left: 2px;
          }

          .performance-metrics-table .count-cell, .performance-metrics-table .percentage-cell, .performance-metrics-table .status-cell {
            font-size: 12px;
            font-weight: 500;
            color: #334155;
            text-align: center;
            min-width: 60px;
          }

          .performance-metrics-table .status-badge {
            font-size: 11px;
            padding: 3px 10px;
            border-radius: 8px;
            font-weight: 600;
            letter-spacing: 0.01em;
            background: #f1f5f9;
            border: 1px solid #e5e7eb;
            color: #64748b;
            display: inline-block;
          }

          .performance-metrics-table .status-gold { background: #fef9c3; color: #bfa100; border-color: #fde047; }
          .performance-metrics-table .status-sold { background: #f1f5f9; color: #22c55e; border-color: #bbf7d0; }
          .performance-metrics-table .status-available { background: #f1f5f9; color: #2563eb; border-color: #bfdbfe; }
          .performance-metrics-table .percentage-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-top: 2px; }
          .performance-metrics-table .percentage-fill { height: 100%; border-radius: 3px; transition: width 0.6s; }
          .performance-metrics-table .gold-fill { background: linear-gradient(90deg, #FFD700 0%, #fbbf24 100%); }
          .performance-metrics-table .sold-fill { background: linear-gradient(90deg, #22c55e 0%, #bbf7d0 100%); }
          .performance-metrics-table .available-fill { background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%); }
          
          /* Ensure insights card is visible and properly sized */
          .insights-card {
            height: auto !important;
            min-height: 200px !important;
            margin-bottom: 12px;
          }
          
          .insights-content {
            padding: 10px 0;
          }
          
          .insight-item {
            padding: 10px 0;
            font-size: 13px;
          }
          
          .insight-label {
            font-size: 13px;
          }
          
          .insight-value {
            font-size: 15px;
          }
        }

        @media (max-width: 600px) {
          .summary-cards {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          
          .export-btn,
          .refresh-btn {
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 500;
          }
          
          .summary-card {
            padding: 12px;
          }
          
          .chart-card {
            padding: 12px;
          }
          
          .quick-stats-card,
          .performance-card,
          .activity-card,
          .insights-card {
            padding: 12px;
          }

          .search-input-wrapper {
            width: 120px;
          }

          .search-input {
            font-size: 11px;
            padding: 5px 8px 5px 26px;
          }

          .search-icon {
            font-size: 11px;
            left: 6px;
          }

          .chart-header {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }

          .search-container {
            justify-content: center;
          }
          
          /* Enhanced mobile styles for insights */
          .insights-card {
            height: auto !important;
            min-height: 180px !important;
            margin-bottom: 10px;
          }
          
          .insights-content {
            padding: 8px 0;
          }
          
          .insight-item {
            padding: 8px 0;
            font-size: 12px;
          }
          
          .insight-label {
            font-size: 12px;
          }
          
          .insight-value {
            font-size: 14px;
          }
        }
        
        @media (max-width: 480px) {
          .summary-cards {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          
          .analytics-container {
            padding: 8px;
          }
          
          .analytics-header {
            padding: 12px;
          }
          
          .header-content h1 {
            font-size: 16px;
          }
          
          .header-content p {
            font-size: 12px;
          }
          
          .export-btn,
          .refresh-btn {
            padding: 5px 8px;
            font-size: 10px;
            font-weight: 500;
          }
          
          .summary-card {
            padding: 10px;
          }
          
          .chart-card {
            padding: 10px;
          }
          
          .quick-stats-card,
          .performance-card,
          .activity-card,
          .insights-card {
            padding: 10px;
          }

          .search-input-wrapper {
            width: 100px;
          }

          .search-input {
            font-size: 10px;
            padding: 4px 6px 4px 22px;
          }

          .search-icon {
            font-size: 10px;
            left: 5px;
          }

          .chart-header {
            flex-direction: column;
            gap: 6px;
            align-items: stretch;
          }

          .search-container {
            justify-content: center;
          }
          
          /* Ultra mobile styles for insights */
          .insights-card {
            height: auto !important;
            min-height: 160px !important;
            margin-bottom: 8px;
          }
          
          .insights-content {
            padding: 6px 0;
          }
          
          .insight-item {
            padding: 6px 0;
            font-size: 11px;
          }
          
          .insight-label {
            font-size: 11px;
          }
          
          .insight-value {
            font-size: 13px;
          }
          
          .chart-content {
            min-height: 140px;
          }
          
          .chart-content.compact {
            min-height: 140px;
          }
          
          .chart-content.enhanced,
          .table-content.enhanced {
            height: 180px;
          }
        }
          font-size: 16px;
          color: #64748b;
        }

        .retry-btn {
          background: #0077d4;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 16px auto 0;
          transition: all 0.2s;
        }

        .retry-btn:hover {
          background: #005ea8;
        }

        @media (max-width: 1200px) {
          .chart-card.large {
            grid-column: span 1;
          }
        }

        @media (max-width: 768px) {
          .analytics-container {
            padding: 16px;
          }

          .analytics-header {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .header-actions {
            flex-wrap: wrap;
            justify-content: center;
          }

          .summary-cards {
            grid-template-columns: 1fr;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .chart-content {
            height: 250px;
          }
        }

        .pagination-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 6px 8px 2px;
        }

        .pagination-controls {
          display: flex;
          gap: 3px;
          align-items: center;
        }

        .pagination-btn {
          padding: 2px 7px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          font-size: 10px;
          font-weight: 500;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #374151;
        }

        .pagination-btn.active {
          background: #0077d4;
          border-color: #0077d4;
          color: white;
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-ellipsis {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 600;
          line-height: 1;
          padding: 0 1px;
        }

        .pagination-mini-info {
          margin-left: 4px;
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
          line-height: 1;
        }

        .weight-cell, .value-cell, .trend-cell {
          text-align: center;
          font-weight: 600;
        }

        .weight-value {
          color: #f59e0b;
          font-size: 13px;
        }

        .value-amount {
          color: #22c55e;
          font-size: 13px;
        }

        .top-product {
          color: #1e293b;
          font-size: 12px;
          font-weight: 500;
        }

        .trend-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .trend-badge.trend-high {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .trend-badge.trend-medium {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .trend-badge.trend-low {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
      `}</style>

      {showAnalyticsModal && (
        <AnalyticsModal 
          data={selectedAnalytics} 
          onClose={() => setShowAnalyticsModal(false)} 
        />
      )}

      {/* Add modal styles */}
      <style>{`
        .analytics-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }

        .analytics-modal-content {
          background: white;
          border-radius: 16px;
          width: 800px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .analytics-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px 20px;
          border-bottom: 2px solid #f1f5f9;
          background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
          border-radius: 16px 16px 0 0;
        }

        .analytics-modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .analytics-modal-icon {
          font-size: 28px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .analytics-modal-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
        }

        .analytics-modal-title p {
          margin: 2px 0 0 0;
          font-size: 13px;
          color: #64748b;
          font-weight: 400;
        }

        .analytics-modal-close {
          background: none;
          border: none;
          font-size: 28px;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .analytics-modal-close:hover {
          background: #f1f5f9;
          color: #374151;
        }

        .analytics-modal-body {
          padding: 28px;
        }

        .analytics-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .analytics-metric-card {
          background: linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
        }

        .analytics-metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .metric-icon {
          font-size: 24px;
          padding: 8px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .metric-content h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }

        .metric-content p {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
        }

        .analytics-breakdown-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .breakdown-section h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          padding-bottom: 8px;
          border-bottom: 2px solid #f1f5f9;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #fafbfc;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          transition: all 0.2s;
        }

        .breakdown-item:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .breakdown-name {
          font-size: 13px;
          font-weight: 400;
          color: #374151;
        }

        .breakdown-count {
          font-size: 13px;
          font-weight: 600;
          color: #0077d4;
          background: white;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .analytics-modal-footer {
          padding: 20px 28px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #fafbfc;
          border-radius: 0 0 16px 16px;
        }

        .analytics-export-btn {
          background: #22c55e;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .analytics-export-btn:hover {
          background: #16a34a;
        }

        .analytics-close-btn {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .analytics-close-btn:hover {
          background: #e2e8f0;
          color: #374151;
        }

        @media (max-width: 768px) {
          .analytics-modal-content {
            width: 95vw;
            margin: 20px;
          }
          
          .analytics-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .analytics-breakdown-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      
      {/* CSS Animations & Responsive Styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
          40%, 43% { transform: translate3d(0,-8px,0); }
          70% { transform: translate3d(0,-4px,0); }
          90% { transform: translate3d(0,-2px,0); }
        }
        
        /* Base Dashboard Container */
        .dashboard-container {
          padding: 16px;
          min-height: 100vh;
        }
        
        /* Metrics Cards Grid Responsive */
        .metrics-cards-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }
        
        @media (max-width: 1400px) {
          .metrics-cards-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        
        @media (max-width: 992px) {
          .metrics-cards-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          
          .metrics-cards-grid > div {
            padding: 12px !important;
            gap: 10px !important;
          }
          
          .metrics-cards-grid > div > div:first-child {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
          }
          
          .metrics-cards-grid > div h3 {
            font-size: 16px !important;
          }
          
          .metrics-cards-grid > div p {
            font-size: 9px !important;
          }
        }
        
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 12px;
          }
          
          .metrics-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          
          .metrics-cards-grid > div {
            padding: 12px !important;
            gap: 10px !important;
            flex-direction: row !important;
          }
          
          .metrics-cards-grid > div > div:first-child {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            border-radius: 8px !important;
          }
          
          .metrics-cards-grid > div > div:first-child svg {
            font-size: 14px !important;
          }
          
          .metrics-cards-grid > div h3 {
            font-size: 15px !important;
            margin-bottom: 2px !important;
          }
          
          .metrics-cards-grid > div p {
            font-size: 9px !important;
          }
        }
        
        @media (max-width: 480px) {
          .dashboard-container {
            padding: 8px;
          }
          
          .metrics-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          
          .metrics-cards-grid > div {
            padding: 10px !important;
            gap: 8px !important;
            border-radius: 10px !important;
          }
          
          .metrics-cards-grid > div > div:first-child {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
          }
          
          .metrics-cards-grid > div h3 {
            font-size: 14px !important;
          }
          
          .metrics-cards-grid > div p {
            font-size: 8px !important;
            letter-spacing: 0 !important;
          }
        }
        
        @media (max-width: 360px) {
          .metrics-cards-grid {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
          
          .metrics-cards-grid > div {
            padding: 8px !important;
          }
          
          .metrics-cards-grid > div h3 {
            font-size: 13px !important;
          }
        }
        
        /* Charts Grid Responsive */
        .charts-grid-responsive {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        
        @media (max-width: 1400px) {
          .charts-grid-responsive {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }
        
        @media (max-width: 992px) {
          .charts-grid-responsive {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          
          .charts-grid-responsive > div {
            padding: 14px !important;
          }
          
          .charts-grid-responsive > div > div[style*="height: 260px"],
          .charts-grid-responsive > div > div[style*="height:260px"] {
            height: 200px !important;
          }
        }
        
        @media (max-width: 768px) {
          .charts-grid-responsive {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          
          .charts-grid-responsive > div {
            padding: 12px !important;
            border-radius: 10px !important;
          }
          
          .charts-grid-responsive > div h3 {
            font-size: 12px !important;
          }
          
          .charts-grid-responsive > div p {
            font-size: 10px !important;
          }
          
          .charts-grid-responsive > div > div[style*="height: 260px"],
          .charts-grid-responsive > div > div[style*="height:260px"] {
            height: 180px !important;
          }
        }
        
        @media (max-width: 576px) {
          .charts-grid-responsive {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .charts-grid-responsive > div {
            padding: 14px !important;
          }
          
          .charts-grid-responsive > div > div[style*="height: 260px"],
          .charts-grid-responsive > div > div[style*="height:260px"] {
            height: 220px !important;
          }
        }
        
        /* Bottom Tables Section Responsive */
        .bottom-tables-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        
        .analytics-table-scroll {
          -webkit-overflow-scrolling: touch;
        }
        
        .analytics-bottom-table {
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .analytics-bottom-table th,
        .analytics-bottom-table td {
          font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        @media (max-width: 1200px) {
          .bottom-tables-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }
        
        @media (max-width: 768px) {
          .bottom-tables-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .bottom-tables-grid > div {
            padding: 12px !important;
          }
          
          .bottom-tables-grid .analytics-bottom-table {
            font-size: 11px !important;
          }
          
          .bottom-tables-grid .analytics-bottom-table th {
            font-size: 11px !important;
            padding: 8px 6px !important;
          }
          
          .bottom-tables-grid .analytics-bottom-table td {
            font-size: 11px !important;
            padding: 6px 4px !important;
          }
          
          .bottom-tables-grid input[type="text"] {
            min-width: 90px !important;
            font-size: 11px !important;
          }
        }
        
        @media (max-width: 480px) {
          .bottom-tables-grid > div {
            padding: 10px !important;
          }
          
          .bottom-tables-grid > div > div:first-child {
            flex-wrap: wrap;
            gap: 8px !important;
          }
          
          .bottom-tables-grid h3 {
            font-size: 13px !important;
          }
          
          .bottom-tables-grid .analytics-bottom-table {
            font-size: 10px !important;
            min-width: 280px !important;
          }
          
          .bottom-tables-grid .analytics-bottom-table th {
            font-size: 10px !important;
            padding: 6px 4px !important;
          }
          
          .bottom-tables-grid .analytics-bottom-table td {
            font-size: 10px !important;
            padding: 5px 3px !important;
          }
        }
        
        /* Loading Progress Bar Responsive */
        @media (max-width: 480px) {
          .loading-progress-bar {
            padding: 10px 12px !important;
          }
          
          .loading-progress-bar span {
            font-size: 12px !important;
          }
        }
        
        /* General Table Responsive */
        @media (max-width: 768px) {
          table {
            font-size: 11px !important;
          }
          
          th, td {
            padding: 8px 6px !important;
          }
        }
        
        @media (max-width: 480px) {
          table {
            font-size: 10px !important;
          }
          
          th, td {
            padding: 6px 4px !important;
          }
        }
        
        /* Search Input Responsive */
        @media (max-width: 480px) {
          input[type="text"][placeholder*="Search"] {
            width: 70px !important;
            font-size: 10px !important;
          }
        }
        
        /* Pagination Responsive */
        .pagination-container {
          flex-wrap: nowrap;
          gap: 4px;
        }
        
        @media (max-width: 480px) {
          .pagination-container {
            justify-content: flex-end;
          }
          
          .pagination-container button {
            padding: 2px 6px !important;
            font-size: 9px !important;
          }
        }
        
        /* Chart Title Responsive */
        @media (max-width: 576px) {
          .chart-title-container h3 {
            font-size: 13px !important;
          }
          
          .chart-title-container p {
            font-size: 10px !important;
          }
          
          .chart-icon-badge {
            width: 20px !important;
            height: 20px !important;
          }
          
          .chart-icon-badge svg {
            font-size: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardAnalytics; 