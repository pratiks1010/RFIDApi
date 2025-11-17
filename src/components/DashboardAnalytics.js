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
  FaDollarSign,
  FaShoppingCart,
  FaBuilding,
  FaUsers,
  FaArrowUp,
  FaArrowDown,
  FaEye
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
import { Line, Bar, Pie } from 'react-chartjs-2';
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
  const [vendorSearch, setVendorSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState(null);
  const [tagUsageData, setTagUsageData] = useState(null);
  const [tagUsageLoading, setTagUsageLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [dummyTagUsage, setDummyTagUsage] = useState({ used: 350, unused: 180 });
  const itemsPerPage = 6;
  const { addNotification } = useNotifications();

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
    await Promise.all([fetchAnalyticsData(), fetchTagUsageData()]);
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
      }, 500);
    };
    
    initializeData();
  }, []);

  // Generate dummy data for loading state
  const generateDummyData = () => {
    const dummyItems = [];
    const categories = ['Gold', 'Silver', 'Diamond', 'Platinum', 'Gemstone'];
    const statuses = ['Active', 'Sold', 'Inactive', 'Pending'];
    const vendors = ['Vendor A', 'Vendor B', 'Vendor C', 'Vendor D', 'Vendor E'];
    const products = ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Pendant', 'Chain', 'Bangle', 'Coin'];
    
    for (let i = 0; i < 150; i++) {
      dummyItems.push({
        ProductName: products[Math.floor(Math.random() * products.length)],
        CategoryName: categories[Math.floor(Math.random() * categories.length)],
        Status: statuses[Math.floor(Math.random() * statuses.length)],
        VendorName: vendors[Math.floor(Math.random() * vendors.length)],
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
    const statusCounts = filteredData.reduce((acc, item) => {
      acc[item.Status] = (acc[item.Status] || 0) + 1;
      return acc;
    }, {});
    const statusColors = {
      'Active': '#22c55e', // green
      'Sold': '#ef4444',   // red
      'Inactive': '#64748b',
      'Pending': '#0077d4',
    };
    const labels = Object.keys(statusCounts);
    return {
      labels,
      datasets: [{
        label: t('analytics.itemsCount'),
        data: Object.values(statusCounts),
        backgroundColor: labels.map(label => statusColors[label] || '#0077d4'),
        borderColor: labels.map(label => statusColors[label] || '#0077d4'),
        borderWidth: 1,
        borderRadius: {
          topLeft: 8,
          topRight: 8,
          bottomLeft: 4,
          bottomRight: 4
        },
        borderSkipped: false,
        hoverBackgroundColor: labels.map(label => {
          const color = statusColors[label] || '#0077d4';
          return color === '#22c55e' ? '#16a34a' : 
                 color === '#ef4444' ? '#dc2626' : 
                 color === '#64748b' ? '#475569' : '#0066cc';
        }),
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
      }]
    };
  };

  // 1. Define color palettes for categories and branches
  const categoryColorPalette = [
    '#0077d4', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#f472b6', '#a3e635', '#fbbf24', '#6366f1', '#0ea5e9', '#b3b3cc', '#60a5fa', '#c0c0c0', '#FFD700', '#bfa100', '#475569', '#10b981', '#fcd34d', '#a21caf'
  ];
  const branchColorPalette = [
    '#2563eb', '#16a34a', '#fbbf24', '#a21caf', '#f87171', '#0ea5e9', '#f59e0b', '#818cf8', '#f472b6', '#65a30d', '#fcd34d', '#0891b2', '#b3b3cc', '#64748b', '#bbf7d0', '#fef9c3', '#f1f5f9', '#fca5a5', '#a3e635', '#f59e42'
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

  const getVendorDistribution = () => {
    const vendorCounts = filteredData.reduce((acc, item) => {
      acc[item.VendorName] = (acc[item.VendorName] || 0) + 1;
      return acc;
    }, {});

    const sortedVendors = Object.entries(vendorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    return {
      labels: sortedVendors.map(([name]) => name.length > 12 ? name.substring(0, 12) + '...' : name),
      datasets: [{
        label: t('analytics.itemsCount'),
        data: sortedVendors.map(([,count]) => count),
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
      acc[item.BranchName] = (acc[item.BranchName] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(branchCounts);
    return {
      labels,
      datasets: [{
        label: t('analytics.itemsCount'),
        data: Object.values(branchCounts),
        backgroundColor: labels.map((_, i) => branchColorPalette[i % branchColorPalette.length]),
        borderColor: labels.map((_, i) => branchColorPalette[i % branchColorPalette.length]),
        borderWidth: 1,
        borderRadius: {
          topLeft: 8,
          topRight: 8,
          bottomLeft: 4,
          bottomRight: 4
        },
        borderSkipped: false,
        hoverBackgroundColor: labels.map((_, i) => {
          const color = branchColorPalette[i % branchColorPalette.length];
          // Darken the color for hover effect
          return color === '#2563eb' ? '#1d4ed8' : 
                 color === '#16a34a' ? '#15803d' : 
                 color === '#fbbf24' ? '#f59e0b' : 
                 color === '#a21caf' ? '#86198f' : 
                 color === '#f87171' ? '#ef4444' : 
                 color === '#0ea5e9' ? '#0284c7' : color;
        }),
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
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

  // Get tag usage distribution data
  const getTagUsageDistribution = () => {
    if (!tagUsageData) {
      // Show dummy data during loading
      const dummyUsed = loading ? dummyTagUsage.used : 0;
      const dummyUnused = loading ? dummyTagUsage.unused : 0;
      return {
        labels: [t('analytics.usedTags'), t('analytics.unusedTags')],
        datasets: [{
          label: t('analytics.tagCount'),
          data: [dummyUsed, dummyUnused],
          backgroundColor: ['#22c55e', '#64748b'],
          borderColor: ['#22c55e', '#64748b'],
          borderWidth: 1,
          borderRadius: {
            topLeft: 8,
            topRight: 8,
            bottomLeft: 4,
            bottomRight: 4
          },
          borderSkipped: false,
          hoverBackgroundColor: ['#16a34a', '#475569'],
          hoverBorderWidth: 2,
          hoverBorderColor: '#ffffff',
        }]
      };
    }

    // Extract used and unused counts from the API response
    // Based on the actual API response structure: UsedCount and UnusedCount
    const usedCount = tagUsageData.UsedCount || 0;
    const unusedCount = tagUsageData.UnusedCount || 0;

    console.log('Tag usage data for chart:', { usedCount, unusedCount }); // Debug log

    return {
      labels: [t('analytics.usedTags'), t('analytics.unusedTags')],
      datasets: [{
        label: t('analytics.tagCount'),
        data: [usedCount, unusedCount],
        backgroundColor: ['#22c55e', '#64748b'],
        borderColor: ['#22c55e', '#64748b'],
        borderWidth: 1,
        borderRadius: {
          topLeft: 8,
          topRight: 8,
          bottomLeft: 4,
          bottomRight: 4
        },
        borderSkipped: false,
        hoverBackgroundColor: ['#16a34a', '#475569'],
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
      }]
    };
  };

  // Calculate summary statistics
  const totalItems = filteredData.length;
  const totalWeight = filteredData.reduce((sum, item) => sum + (parseFloat(item.GrossWt) || 0), 0);
  const totalValue = filteredData.reduce((sum, item) => sum + (parseFloat(item.TodaysRate) * parseFloat(item.GrossWt) || 0), 0);
  const soldItems = filteredData.filter(item => item.Status === 'Sold').length;
  const availableItems = filteredData.filter(item => item.Status !== 'Sold').length;
  const uniqueVendors = [...new Set(filteredData.map(item => item.VendorName))].length;

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
    const logoUrl = '/Logo/Sparkle RFID svg.svg';
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

    // Top Vendors
    doc.setFillColor(232, 254, 240); // very light green
    doc.roundedRect(40, y, pageWidth-80, 32, 8, 8, 'F');
    doc.setFontSize(16);
    doc.setTextColor('#22c55e');
    doc.text(t('analytics.chart.vendorDistribution'), pageWidth/2, y+22, { align: 'center' });
    y += 48;
    autoTable(doc, {
      startY: y,
      head: [[t('analytics.rank'), t('analytics.vendorName'), t('analytics.items'), t('analytics.performance')]],
      body: (() => {
        const vendorCounts = filteredData.reduce((acc, item) => {
          acc[item.VendorName] = (acc[item.VendorName] || 0) + 1;
          return acc;
        }, {});
        const sortedVendors = Object.entries(vendorCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 8);
        const maxCount = Math.max(...Object.values(vendorCounts));
        return sortedVendors.map(([name, count], idx) => [
          idx+1,
          name,
          count,
          `${((count/maxCount)*100).toFixed(0)}%`
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
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          <span>{t('analytics.pagination.showing')} {startItem}-{endItem} {t('analytics.pagination.of')} {totalItems}</span>
        </div>
        <div className="pagination-controls">
          <button 
            className="pagination-btn" 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button 
            className="pagination-btn" 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
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
        const selectedBranch = branchLabels[elementIndex];
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
    
    const vendorBreakdown = items.reduce((acc, item) => {
      acc[item.VendorName] = (acc[item.VendorName] || 0) + 1;
      return acc;
    }, {});
    
    return {
      byStatus: Object.entries(statusBreakdown).sort(([,a], [,b]) => b - a).slice(0, 5),
      topVendors: Object.entries(vendorBreakdown).sort(([,a], [,b]) => b - a).slice(0, 5),
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
                <h4>{data.type === 'status' ? t('analytics.modal.topItems') : data.type === 'category' ? t('analytics.chart.vendorDistribution') : t('analytics.byStatus')}</h4>
                <div className="breakdown-list">
                  {(data.type === 'status' ? data.breakdown.topProducts : 
                    data.type === 'category' ? data.breakdown.topVendors : 
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
          afterLabel: () => 'Click to view details'
        }
      }
    },
    elements: {
      bar: {
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff'
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
    ...chartOptions,
    onClick: (event, elements) => handleChartClick(event, elements, 'branch'),
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
      bar: {
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
    <div style={{
      padding: '16px',
      background: '#f8fafc',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      opacity: loading ? 0.85 : 1,
      transition: 'opacity 0.3s ease'
    }}>
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

      {/* Compact Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {[
          { 
            icon: FaGem, 
            label: t('analytics.totalItems'), 
            value: totalItems,
            suffix: '',
            decimals: 0,
            color: '#3b82f6'
          },
          { 
            icon: FaWeight, 
            label: t('analytics.modal.totalWeight'), 
            value: totalWeight,
            suffix: 'g',
            decimals: 2,
            color: '#10b981'
          },
          { 
            icon: FaDollarSign, 
            label: t('analytics.modal.totalValue'), 
            value: totalValue,
            suffix: '',
            decimals: 0,
            prefix: '₹',
            color: '#f59e0b'
          },
          { 
            icon: FaShoppingCart, 
            label: t('analytics.soldItems'), 
            value: soldItems,
            suffix: '',
            decimals: 0,
            color: '#ef4444'
          },
          { 
            icon: FaBoxes, 
            label: t('analytics.activeItems'), 
            value: availableItems,
            suffix: '',
            decimals: 0,
            color: '#8b5cf6'
          },
          { 
            icon: FaBuilding, 
            label: t('analytics.chart.vendorDistribution'), 
            value: uniqueVendors,
            suffix: '',
            decimals: 0,
            color: '#06b6d4'
          }
        ].map((card, index) => (
          <div key={index} style={{
            background: 'white',
            borderRadius: '6px',
            padding: '16px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 2s infinite',
                pointerEvents: 'none'
              }} />
            )}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '6px',
              background: card.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <card.icon style={{ color: 'white', fontSize: '18px' }} />
          </div>
            
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 2px 0'
              }}>
                {card.prefix || ''}
                <AnimatedNumber 
                  value={card.value} 
                  suffix={card.suffix} 
                  decimals={card.decimals}
                />
              </h3>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: 0
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

      {/* Compact Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Status Distribution Chart */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
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
                color: '#111827',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.statusDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#6b7280',
                margin: 0
              }}>
                Overview of item status across inventory
              </p>
          </div>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaChartBar style={{ color: 'white', fontSize: '12px' }} />
          </div>
        </div>
          <div style={{ height: '200px' }}>
            <Bar data={getStatusDistribution()} options={chartOptionsWithClick} />
          </div>
          </div>

        {/* Category Distribution Chart */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
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
                color: '#111827',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.categoryDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#6b7280',
                margin: 0
              }}>
                {t('analytics.modal.breakdown')}
              </p>
        </div>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaChartBar style={{ color: 'white', fontSize: '12px' }} />
          </div>
          </div>
          <div style={{ height: '200px' }}>
            <Pie data={getCategoryDistribution()} options={pieChartOptions} />
        </div>
      </div>

        {/* Branch Distribution Chart */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
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
                color: '#111827',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.branchDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#6b7280',
                margin: 0
              }}>
                {t('analytics.chart.branchDistribution')}
              </p>
              </div>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaChartBar style={{ color: 'white', fontSize: '12px' }} />
              </div>
            </div>
          <div style={{ height: '200px' }}>
                <Bar data={getBranchDistribution()} options={branchChartOptions} />
            </div>
          </div>

        {/* Tag Usage Distribution Chart */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
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
                color: '#111827',
                margin: '0 0 2px 0'
              }}>
                {t('analytics.tagUsageDistribution')}
              </h3>
              <p style={{
                fontSize: '11px',
                color: '#6b7280',
                margin: 0
              }}>
                {t('analytics.chart.tagUsageDistribution')}
              </p>
        </div>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaChartBar style={{ color: 'white', fontSize: '12px' }} />
            </div>
          </div>
          <div style={{ height: '200px', position: 'relative' }}>
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
                          size: 9,
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
                            size: 10,
                            family: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                          }
                        }
                      }
                    }
                  }} 
                />
            </div>
          </div>
      </div>

      {/* Compact Bottom Sections */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {/* Top Products */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '3px',
                background: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: 'white', fontSize: '10px' }}>🏆</span>
              </div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                {t('analytics.modal.topItems')}
              </h3>
            </div>
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <FaSearch style={{ color: '#9ca3af', fontSize: '10px' }} />
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
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px'
            }}>
                <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb'
                }}>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.rank')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>Product Name</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.count')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                  const productCounts = data.reduce((acc, item) => {
                      acc[item.ProductName] = (acc[item.ProductName] || 0) + 1;
                      return acc;
                    }, {});
                    
                    const filteredProductCounts = Object.entries(productCounts)
                      .filter(([name]) => name.toLowerCase().includes(productSearch.toLowerCase()));
                    
                    const sortedProducts = filteredProductCounts
                      .sort(([,a], [,b]) => b - a);
                    const total = filteredProductCounts.reduce((sum, [,count]) => sum + count, 0);
                    
                    const startIndex = (productPage - 1) * itemsPerPage;
                    const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);
                    
                    return (
                      <>
                        {paginatedProducts.map(([name, count], index) => (
                        <tr key={name} style={{
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          <td style={{
                            padding: '6px',
                            color: '#6b7280',
                            fontSize: '11px'
                          }}>{startIndex + index + 1}</td>
                          <td style={{
                            padding: '6px'
                          }}>
                            <div>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '500',
                                color: '#111827'
                              }}>
                                {name.length > 15 ? name.substring(0, 15) + '...' : name}
                              </div>
                              <div style={{
                                fontSize: '10px',
                                color: '#6b7280'
                              }}>
                                Product Item
                              </div>
                              </div>
                            </td>
                          <td style={{
                            padding: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#111827'
                          }}>
                            {count.toLocaleString()}
                            </td>
                          <td style={{
                            padding: '6px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{
                                fontSize: '10px',
                                color: '#6b7280',
                                minWidth: '30px'
                              }}>
                                {((count / total) * 100).toFixed(1)}%
                              </span>
                              <div style={{
                                flex: 1,
                                height: '4px',
                                background: '#e5e7eb',
                                borderRadius: '2px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%',
                                  background: '#3b82f6',
                                  width: `${(count / total) * 100}%`
                                }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
          </div>
        </div>

        {/* Top Vendors */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '3px',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaUsers style={{ color: 'white', fontSize: '10px' }} />
              </div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                {t('analytics.chart.vendorDistribution')}
              </h3>
            </div>
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <FaSearch style={{ color: '#9ca3af', fontSize: '10px' }} />
                <input
                  type="text"
                  placeholder={t('analytics.searchVendors')}
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
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
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px'
            }}>
                <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb'
                }}>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.rank')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.vendorName')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.items')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.performance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                  const vendorCounts = data.reduce((acc, item) => {
                    acc[item.Vendor] = (acc[item.Vendor] || 0) + 1;
                      return acc;
                    }, {});
                    
                    const filteredVendorCounts = Object.entries(vendorCounts)
                      .filter(([name]) => name && name.toLowerCase().includes(vendorSearch.toLowerCase()));
                    
                    const sortedVendors = filteredVendorCounts
                      .sort(([,a], [,b]) => b - a);
                    const maxCount = filteredVendorCounts.length > 0 ? Math.max(...filteredVendorCounts.map(([,count]) => count)) : 0;
                    
                    const startIndex = (vendorPage - 1) * itemsPerPage;
                    const paginatedVendors = sortedVendors.slice(startIndex, startIndex + itemsPerPage);
                    
                    return (
                      <>
                        {paginatedVendors.map(([name, count], index) => (
                        <tr key={name} style={{
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          <td style={{
                            padding: '6px',
                            color: '#6b7280',
                            fontSize: '11px'
                          }}>{startIndex + index + 1}</td>
                          <td style={{
                            padding: '6px'
                          }}>
                            <div>
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '500',
                                color: '#111827'
                              }}>
                                {name?.length > 15 ? name.substring(0, 15) + '...' : name || 'Unknown'}
                              </div>
                              <div style={{
                                fontSize: '10px',
                                color: '#6b7280'
                              }}>
                                Supplier
                              </div>
                              </div>
                            </td>
                          <td style={{
                            padding: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#111827'
                          }}>
                            {count.toLocaleString()}
                            </td>
                          <td style={{
                            padding: '6px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{
                                fontSize: '10px',
                                color: '#6b7280',
                                minWidth: '30px'
                              }}>
                                {((count / maxCount) * 100).toFixed(0)}%
                              </span>
                              <div style={{
                                flex: 1,
                                height: '4px',
                                background: '#e5e7eb',
                                borderRadius: '2px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%',
                                  background: '#10b981',
                                  width: `${(count / maxCount) * 100}%`
                                }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })()}
                </tbody>
              </table>
          </div>
        </div>

        {/* Category Performance Analysis */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '16px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaChartLine style={{ color: 'white', fontSize: '10px' }} />
          </div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              {t('analytics.chart.categoryDistribution')}
            </h3>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px'
            }}>
                <thead>
                <tr style={{
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb'
                }}>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.categoryName')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.items')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>Weight (G)</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.avgValue')}</th>
                  <th style={{
                    padding: '8px 6px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '11px'
                  }}>{t('analytics.topProduct')}</th>
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
                        padding: '6px'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '500',
                            color: '#111827'
                          }}>
                            {item.category}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: '#6b7280'
                          }}>
                            Product Category
                          </div>
                          </div>
                        </td>
                      <td style={{
                        padding: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        {item.totalItems.toLocaleString()}
                        </td>
                      <td style={{
                        padding: '6px',
                        fontSize: '11px',
                        color: '#111827'
                      }}>
                        {item.totalWeight}g
                        </td>
                      <td style={{
                        padding: '6px',
                        fontSize: '11px',
                        color: '#111827'
                      }}>
                        {item.avgValue}
                        </td>
                      <td style={{
                        padding: '6px',
                        fontSize: '11px',
                        color: '#111827'
                      }}>
                        {item.topProduct.length > 12 ? item.topProduct.substring(0, 12) + '...' : item.topProduct}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
          </div>
        </div>
      </div>

      <style jsx>{`
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
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-top: 1px solid #f1f5f9;
          background: #fafbfc;
          border-radius: 0 0 8px 8px;
        }

        .pagination-info {
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
        }

        .pagination-controls {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .pagination-btn {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 32px;
          height: 32px;
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
      <style jsx>{`
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
      
      {/* CSS Animations */}
      <style jsx>{`
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
        
        /* Responsive Design */
        @media (max-width: 1200px) {
          .charts-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .summary-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .summary-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardAnalytics; 