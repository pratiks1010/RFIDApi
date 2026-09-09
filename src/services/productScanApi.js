import axios from 'axios';
import { toRrgoldApiUrl } from './apiBaseConfig';

const IMAGE_BASE_URL = 'https://rrgold.loyalstring.co.in/';

// Sample demo product data following the user specification
export const SAMPLE_PRODUCT_DATA = {
  id: 1420,
  itemCode: 'RT1001',
  productTitle: '22KT Royal Antique Gold Necklace',
  productCode: 'NCK-0091',
  hsnCode: '71131910',
  description: 'Handcrafted antique gold choker with certified ruby and uncut polki diamonds. Created by master artisans using time-honored heritage techniques.',
  categoryName: 'Necklace',
  purityName: '22KT (916)',
  metalName: 'Gold',
  colour: 'Yellow Gold',
  size: '16 inch',
  designName: 'Royal Heritage',
  collectionName: 'Bridal 2024',
  occassionName: 'Wedding',
  gender: 'Women',

  // Weights
  grossWt: '52.006',
  netWt: '50.450',
  totalStoneWeight: '1.200',
  totalDiamondWeight: '0.356',
  pieces: '1',

  // Images
  primaryImageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',
  imageUrls: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
  ],

  // Live Price Breakdown
  todaysMetalRate: 7250.00,
  estimatedMetalAmount: 365762.50,
  makingCharges: 36576.25,
  makingType: 'Percentage (10%)',
  hallmarkAmount: 45.00,
  totalStoneAmount: 8500.00,
  totalDiamondAmount: 28400.00,
  estimatedTotalPrice: 439283.75,
  mrp: '450000.00',
  offerPrice: '439000.00',

  // Hallmarking
  huidCode: 'H67K9P',
  isHallmarked: true,

  // Showroom & Jeweler Info
  status: 'In Stock',
  branchName: 'Main Flagship Store',
  branchAddress: 'Plot 42, Zaveri Bazaar, Mumbai',
  counterName: 'Bridal Counter',
  jewelerName: 'Sparkle Jewellers',
  jewelerPhone: '+91 9876543210',
  jewelerEmail: 'contact@sparklejewellers.com',

  // Stones & Diamonds
  diamonds: [
    {
      diamondName: 'Polki Diamond',
      weight: '0.356',
      pieces: '14',
      cut: 'Uncut',
      clarity: 'VS-SI',
      certificate: 'IGI Certified',
      amount: '28400',
    },
  ],
  stones: [
    {
      stoneName: 'Burmese Ruby',
      weight: '1.200',
      pieces: '6',
      amount: '8500',
      certificate: 'Lab Certified',
    },
  ],

  // Similar Items
  similarProducts: [
    {
      id: 1425,
      itemCode: 'RT1006',
      productTitle: 'Antique Bridal Choker',
      categoryName: 'Necklace',
      grossWt: '48.200',
      netWt: '46.100',
      estimatedPrice: 395000.00,
      primaryImageUrl: 'https://images.unsplash.com/photo-1611591475806-a66f461e72a0?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 1430,
      itemCode: 'RT1012',
      productTitle: 'Temple Heritage Haram',
      categoryName: 'Necklace',
      grossWt: '64.500',
      netWt: '61.800',
      estimatedPrice: 520000.00,
      primaryImageUrl: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 1435,
      itemCode: 'RT1018',
      productTitle: 'Kundan Floral Choker',
      categoryName: 'Necklace',
      grossWt: '42.100',
      netWt: '39.800',
      estimatedPrice: 345000.00,
      primaryImageUrl: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=600&q=80',
    },
  ],
};

export const getProductScanApiBaseUrl = () => {
  // If explicitly specified in environment
  if (process.env.REACT_APP_PRODUCT_SCAN_API_URL) {
    return process.env.REACT_APP_PRODUCT_SCAN_API_URL.replace(/\/$/, '');
  }
  // In development mode on localhost, can check localhost:7095
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalDev && process.env.NODE_ENV === 'development') {
    return 'https://localhost:7095';
  }
  // Production default: rrgold production API
  return toRrgoldApiUrl('').replace(/\/$/, '') || 'https://rrgold.loyalstring.co.in';
};

export const getPublicScannerBaseUrl = () => {
  // 1. If explicit public web domain is configured
  if (process.env.REACT_APP_PUBLIC_WEB_URL) {
    return process.env.REACT_APP_PUBLIC_WEB_URL.replace(/\/$/, '');
  }
  // 2. If running on a deployed web domain (not file:// and not localhost)
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && !origin.startsWith('file:') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      const pathname = window.location.pathname.replace(/\/$/, '');
      return `${origin}${pathname}`;
    }
    // Fallback to local origin during local dev
    if (origin && !origin.startsWith('file:')) {
      const pathname = window.location.pathname.replace(/\/$/, '');
      return `${origin}${pathname}`;
    }
  }
  return 'https://rrgold.loyalstring.co.in';
};

/**
 * Encode an item object into a URL-safe base64 string
 */
export function encodeProductForUrl(item) {
  try {
    if (!item) return '';
    const compact = {
      id: item.Id || item.id,
      itemCode: item.ItemCode || item.itemCode || item.RFIDCode,
      productTitle: item.ProductName || item.CategoryName || item.productTitle || '',
      productCode: item.ProductCode || item.productCode || '',
      categoryName: item.CategoryName || item.categoryName || item.Category || '',
      purityName: item.PurityName || item.purityName || item.Purity || '',
      grossWt: item.GrossWt != null ? String(item.GrossWt) : '',
      netWt: item.NetWt != null ? String(item.NetWt) : '',
      stoneWt: item.StoneWt != null ? String(item.StoneWt) : (item.TotalStoneWeight != null ? String(item.TotalStoneWeight) : ''),
      diamondWt: item.DiamondWt != null ? String(item.DiamondWt) : (item.TotalDiamondWeight != null ? String(item.TotalDiamondWeight) : ''),
      stoneAmt: item.StoneAmt != null ? String(item.StoneAmt) : (item.TotalStoneAmount != null ? String(item.TotalStoneAmount) : ''),
      diamondAmt: item.DiamondAmt != null ? String(item.DiamondAmt) : (item.TotalDiamondAmount != null ? String(item.TotalDiamondAmount) : ''),
      hallmarkAmount: item.HallmarkAmount != null ? String(item.HallmarkAmount) : '',
      description: item.Description || item.description || '',
      branchName: item.Branch || item.BranchName || '',
      counterName: item.CounterName || item.BoxName || '',
      huidCode: item.HuidCode || item.HUID || '',
      images: item.Images || '',
      imageUrl: item.ImageUrl || item.image || item.Image1 || '',
    };
    const str = unescape(encodeURIComponent(JSON.stringify(compact)));
    const b64 = typeof window !== 'undefined' && typeof window.btoa === 'function'
      ? window.btoa(str)
      : (typeof Buffer !== 'undefined' ? Buffer.from(str, 'binary').toString('base64') : btoa(str));
    return encodeURIComponent(b64);
  } catch (err) {
    console.warn('Error encoding product for URL:', err);
    return '';
  }
}

/**
 * Decode a URL base64 string back into an item object
 */
export function decodeProductFromUrl(encodedStr) {
  try {
    if (!encodedStr) return null;
    const cleanB64 = decodeURIComponent(encodedStr);
    const raw = typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob(cleanB64)
      : (typeof Buffer !== 'undefined' ? Buffer.from(cleanB64, 'base64').toString('binary') : atob(cleanB64));
    const jsonStr = decodeURIComponent(escape(raw));
    return JSON.parse(jsonStr);
  } catch (err) {
    console.warn('Error decoding product from URL:', err);
    return null;
  }
}

/**
 * Resolve correct public image URL for a product item
 */
export function resolveItemImageUrl(item) {
  if (!item) return null;

  // If item already has a primaryImageUrl that is not Unsplash
  if (item.primaryImageUrl && typeof item.primaryImageUrl === 'string' && !item.primaryImageUrl.includes('unsplash.com')) {
    return item.primaryImageUrl;
  }

  const imagesStr = item.Images || item.images;
  if (imagesStr && typeof imagesStr === 'string' && imagesStr.trim()) {
    const paths = imagesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const lastPath = paths.length > 0 ? paths[paths.length - 1] : null;
    if (lastPath) {
      if (lastPath.startsWith('http://') || lastPath.startsWith('https://')) return lastPath;
      const base = IMAGE_BASE_URL.replace(/\/$/, '');
      const path = lastPath.replace(/^\//, '');
      return `${base}/${path}`;
    }
  }

  const direct = item.Image1 || item.imageurl || item.ImageUrl || item.imageUrl || item.image;
  if (direct && typeof direct === 'string' && direct.trim()) {
    if (direct.startsWith('http://') || direct.startsWith('https://') || direct.startsWith('blob:') || direct.startsWith('data:')) {
      return direct;
    }
    const base = IMAGE_BASE_URL.replace(/\/$/, '');
    const path = String(direct).replace(/^\//, '');
    return `${base}/${path}`;
  }

  return null;
}

/**
 * Calculate live gold rate based on purity
 */
export function getRateForPurity(purityName, base24kRate = 7850) {
  const p = String(purityName || '').toUpperCase();
  if (p.includes('14K') || p.includes('585')) return Math.round(base24kRate * (14 / 24));
  if (p.includes('18K') || p.includes('750')) return Math.round(base24kRate * (18 / 24));
  if (p.includes('22K') || p.includes('916')) return Math.round(base24kRate * (22 / 24));
  if (p.includes('24K') || p.includes('999')) return base24kRate;
  return 7250;
}

/**
 * Fetch product details by scanned value (ItemCode, RFID, Barcode, or full URL)
 */
export async function fetchProductScanDetails(scanValue, clientCode = '', encodedData = '') {
  if (!scanValue && !encodedData) {
    throw new Error('Scan value is required');
  }

  let cleanValue = String(scanValue || '').trim();
  try {
    if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
      const url = new URL(cleanValue);
      const codeFromUrl = url.searchParams.get('code') || url.searchParams.get('itemCode');
      const clientFromUrl = url.searchParams.get('clientCode') || url.searchParams.get('tenant');
      const dataFromUrl = url.searchParams.get('d') || url.searchParams.get('p');
      if (codeFromUrl) cleanValue = codeFromUrl;
      if (clientFromUrl && !clientCode) clientCode = clientFromUrl;
      if (dataFromUrl && !encodedData) encodedData = dataFromUrl;
    }
  } catch (_) {
    // Keep cleanValue as-is
  }

  // 1. If encoded item data was passed in the QR URL (?d=...), decode it immediately
  if (encodedData) {
    const decoded = decodeProductFromUrl(encodedData);
    if (decoded && (decoded.itemCode || decoded.ItemCode)) {
      return adaptStockItemToPublicData(decoded);
    }
  }

  // 2. Check local/session storage cache for this specific item
  try {
    const cachedItemStr = localStorage.getItem(`qr_product_${cleanValue}`) ||
                          sessionStorage.getItem(`qr_product_${cleanValue}`) ||
                          localStorage.getItem('qr_product_latest');
    if (cachedItemStr) {
      const parsed = JSON.parse(cachedItemStr);
      if (parsed && (parsed.ItemCode === cleanValue || parsed.itemCode === cleanValue || parsed.RFIDCode === cleanValue)) {
        return adaptStockItemToPublicData(parsed);
      }
    }
  } catch (_) {}

  // 3. Try ProductScan/Scan API
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && process.env.NODE_ENV === 'development';
  const rrgoldBase = toRrgoldApiUrl('').replace(/\/$/, '') || 'https://rrgold.loyalstring.co.in';
  const localBase = 'https://localhost:7095';

  const scanEndpoints = !isLocalDev
    ? [`${rrgoldBase}/api/ProductScan/Scan`, `${localBase}/api/ProductScan/Scan`]
    : [`${localBase}/api/ProductScan/Scan`, `${rrgoldBase}/api/ProductScan/Scan`];

  for (const postUrl of scanEndpoints) {
    try {
      const postRes = await axios.post(
        postUrl,
        {
          scanValue: cleanValue,
          clientCode: clientCode || undefined,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 4000,
        }
      );

      if (postRes?.data?.success && postRes.data.data) {
        return postRes.data.data;
      }
      if (postRes?.data && !postRes.data.success && postRes.data.message) {
        throw new Error(postRes.data.message);
      }
    } catch (err) {
      // Try GET on the same endpoint
      try {
        const getUrl = `${postUrl}?code=${encodeURIComponent(cleanValue)}&clientCode=${encodeURIComponent(clientCode || '')}`;
        const getRes = await axios.get(getUrl, { timeout: 3000 });
        if (getRes?.data?.success && getRes.data.data) {
          return getRes.data.data;
        }
      } catch (_) {}
    }
  }

  // 4. Try Stock API endpoint GetAllLabeledStock to find this real item
  const stockEndpoints = !isLocalDev
    ? [`${rrgoldBase}/api/ProductMaster/GetAllLabeledStock`, `${localBase}/api/ProductMaster/GetAllLabeledStock`]
    : [`${localBase}/api/ProductMaster/GetAllLabeledStock`, `${rrgoldBase}/api/ProductMaster/GetAllLabeledStock`];

  for (const stockUrl of stockEndpoints) {
    try {
      const stockRes = await axios.post(
        stockUrl,
        {
          ClientCode: clientCode || undefined,
          ItemCode: cleanValue,
          Page: 1,
          PageSize: 1,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 4000,
        }
      );

      const items = Array.isArray(stockRes.data)
        ? stockRes.data
        : (stockRes.data?.data || stockRes.data?.Data || stockRes.data?.Items || []);

      if (Array.isArray(items) && items.length > 0) {
        const matched = items.find((it) => it.ItemCode === cleanValue || it.RFIDCode === cleanValue) || items[0];
        if (matched) {
          return adaptStockItemToPublicData(matched);
        }
      }
    } catch (_) {}
  }

  // 5. Special fallback for demo code RT1001
  const normalized = cleanValue.toUpperCase();
  if (normalized === 'RT1001' || normalized === 'DEMO') {
    return {
      ...SAMPLE_PRODUCT_DATA,
      itemCode: cleanValue,
    };
  }

  // 6. Generic adaptation for any other item code
  return adaptStockItemToPublicData({
    ItemCode: cleanValue,
    ProductName: `Jewelry Item (${cleanValue})`,
  });
}

/**
 * Adapt a real stock item from ERP into the luxury public format
 */
export function adaptStockItemToPublicData(item) {
  const grossWt = parseFloat(item.GrossWt || item.grossWt || 0);
  const netWt = parseFloat(item.NetWt || item.netWt || grossWt || 0);
  const stoneWt = parseFloat(item.StoneWt || item.stoneWt || item.TotalStoneWeight || 0);
  const diamondWt = parseFloat(item.DiamondWt || item.diamondWt || item.TotalDiamondWeight || 0);

  const purity = item.PurityName || item.purityName || item.Purity || item.purity || '22KT (916)';
  const goldRate = getRateForPurity(purity);
  const metalAmt = netWt * goldRate;
  const makingCharges = metalAmt * 0.10;
  const hallmarkAmt = item.HallmarkAmount ? parseFloat(item.HallmarkAmount) || 45 : 45;

  const stoneAmtFromItem = parseFloat(item.StoneAmt || item.stoneAmt || item.TotalStoneAmount || 0);
  const totalStoneAmt = stoneAmtFromItem > 0 ? stoneAmtFromItem : (stoneWt > 0 ? stoneWt * 5000 : 0);

  const diamondAmtFromItem = parseFloat(item.DiamondAmt || item.diamondAmt || item.TotalDiamondAmount || 0);
  const totalDiamondAmt = diamondAmtFromItem > 0 ? diamondAmtFromItem : (diamondWt > 0 ? diamondWt * 75000 : 0);

  const estTotal = metalAmt + makingCharges + hallmarkAmt + totalStoneAmt + totalDiamondAmt;
  const primaryImage = resolveItemImageUrl(item);

  const itemCode = item.ItemCode || item.itemCode || item.RFIDCode || 'ITEM';
  const rawTitle = item.ProductName || item.productTitle || item.CategoryName || item.Description || 'Fine Jewelry';
  const productTitle = rawTitle.includes(purity) ? rawTitle : `${purity} ${rawTitle}`;

  return {
    id: item.Id || item.id || 1001,
    itemCode: itemCode,
    productTitle: productTitle,
    productCode: item.ProductCode || item.productCode || itemCode,
    hsnCode: item.HsnCode || item.hsnCode || '71131910',
    description: item.Description || item.description || `Handcrafted ${purity} fine jewelry piece with certified hallmarking and authentic purity assurance.`,
    categoryName: item.CategoryName || item.categoryName || item.Category || 'Jewelry',
    purityName: purity,
    metalName: item.MetalName || item.metalName || 'Gold',
    colour: item.Colour || item.colour || item.Color || 'Yellow Gold',
    size: item.Size || item.size || 'Standard',
    designName: item.DesignName || item.designName || item.Design || 'Classic Heritage',
    collectionName: item.CollectionName || item.collectionName || 'Curated 2025',
    occassionName: item.OccasionName || item.occassionName || 'Celebration',
    gender: item.Gender || item.gender || 'Unisex',

    grossWt: grossWt.toFixed(3),
    netWt: netWt.toFixed(3),
    totalStoneWeight: stoneWt.toFixed(3),
    totalDiamondWeight: diamondWt.toFixed(3),
    primaryImageUrl: primaryImage || null,
    imageUrls: (() => {
      const all = [];
      const imagesStr = item.Images || item.images;
      if (imagesStr && typeof imagesStr === 'string' && imagesStr.trim()) {
        const paths = imagesStr.split(',').map((s) => s.trim()).filter(Boolean);
        for (const p of paths) {
          if (p.startsWith('http://') || p.startsWith('https://')) {
            all.push(p);
          } else {
            all.push(`${IMAGE_BASE_URL.replace(/\/$/, '')}/${p.replace(/^\//, '')}`);
          }
        }
      }
      if (all.length === 0 && primaryImage) {
        all.push(primaryImage);
      }
      return all;
    })(),

    pieces: item.Qty || item.pieces || '1',
    todaysMetalRate: goldRate,
    estimatedMetalAmount: Math.round(metalAmt * 100) / 100,
    makingCharges: Math.round(makingCharges * 100) / 100,
    makingType: 'Percentage (10%)',
    hallmarkAmount: hallmarkAmt,
    totalStoneAmount: Math.round(totalStoneAmt * 100) / 100,
    totalDiamondAmount: Math.round(totalDiamondAmt * 100) / 100,
    estimatedTotalPrice: Math.round(estTotal * 100) / 100,
    mrp: Math.round(estTotal * 1.08).toString(),
    offerPrice: Math.round(estTotal).toString(),

    huidCode: item.HuidCode || item.huidCode || item.HUID || 'H72K9P',
    isHallmarked: true,

    status: item.Status || item.status || 'In Stock',
    branchName: item.Branch || item.branchName || item.BranchName || 'Main Flagship Showroom',
    branchAddress: 'Zaveri Bazaar, Mumbai',
    counterName: item.CounterName || item.counterName || item.BoxName || 'Gold Counter',
    jewelerName: 'Sparkle Jewellers',
    jewelerPhone: '+91 9876543210',
    jewelerEmail: 'contact@sparklejewellers.com',

    diamonds: diamondWt > 0 ? [
      {
        diamondName: 'Certified Natural Diamond',
        weight: diamondWt.toFixed(3),
        pieces: item.DiamondPcs || '12',
        cut: 'Round Brilliant',
        clarity: 'VVS-VS',
        certificate: 'IGI Certified',
        amount: String(Math.round(totalDiamondAmt)),
      },
    ] : [],
    stones: stoneWt > 0 ? [
      {
        stoneName: 'Precious Color Stone',
        weight: stoneWt.toFixed(3),
        pieces: item.StonePcs || '4',
        amount: String(Math.round(totalStoneAmt)),
        certificate: 'Certified',
      },
    ] : [],
    similarProducts: SAMPLE_PRODUCT_DATA.similarProducts,
  };
}

/**
 * Currency formatter (INR)
 */
export function formatCurrencyINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
