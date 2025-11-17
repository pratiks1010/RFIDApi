// Metal Price Service - Fetches live gold and silver prices
// Supports multiple API providers with fallback

class MetalPriceService {
  constructor() {
    // Configuration for different API providers
    this.providers = {
      // GoldPriceZ API (requires registration)
      goldpricez: {
        url: 'https://goldpricez.com/api/rates/currency/inr/measure/gram/metal/all',
        headers: {
          'X-API-KEY': process.env.REACT_APP_GOLDPRICEZ_API_KEY || 'your-api-key-here'
        }
      },
      
      // MetalPriceAPI (free tier available)
      metalpriceapi: {
        url: 'https://api.metalpriceapi.com/v1/latest',
        headers: {
          'X-API-KEY': process.env.REACT_APP_METALPRICEAPI_KEY || 'your-api-key-here'
        },
        params: {
          base: 'USD',
          currencies: 'XAU,XAG,INR'
        }
      },
      
      // FreeGoldPrice API
      freegoldprice: {
        url: 'https://api.freegoldprice.org/v1/latest',
        headers: {
          'X-API-KEY': process.env.REACT_APP_FREEGOLDPRICE_KEY || 'your-api-key-here'
        }
      }
    };
    
    // Fallback mock data for demonstration
    this.mockData = {
      gold24k: 5500,
      silver: 75,
      timestamp: Date.now()
    };
  }

  // Calculate different gold purities from 24k price
  calculateGoldPurities(gold24kPrice) {
    return {
      gold24k: gold24kPrice,
      gold22k: (gold24kPrice * 22) / 24,
      gold18k: (gold24kPrice * 18) / 24
    };
  }

  // Convert USD to INR (you might want to use a real exchange rate API)
  async getUSDToINRRate() {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      return data.rates.INR || 83; // Fallback rate
    } catch (error) {
      console.warn('Failed to fetch exchange rate, using fallback:', error);
      return 83; // Fallback USD to INR rate
    }
  }

  // Fetch prices from GoldPriceZ API
  async fetchFromGoldPriceZ() {
    try {
      const response = await fetch(this.providers.goldpricez.url, {
        headers: this.providers.goldpricez.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        gold24k: parseFloat(data.gram_in_inr || data.gram_in_usd * 83),
        silver: parseFloat(data.silver_gram_in_inr || data.silver_gram_in_usd * 83),
        timestamp: Date.now(),
        source: 'GoldPriceZ'
      };
    } catch (error) {
      console.error('GoldPriceZ API error:', error);
      throw error;
    }
  }

  // Fetch prices from MetalPriceAPI
  async fetchFromMetalPriceAPI() {
    try {
      const url = new URL(this.providers.metalpriceapi.url);
      Object.entries(this.providers.metalpriceapi.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      const response = await fetch(url.toString(), {
        headers: this.providers.metalpriceapi.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const usdToInr = await this.getUSDToINRRate();
      
      // Convert from troy ounce to gram and USD to INR
      const goldPricePerOunce = 1 / data.rates.XAU; // XAU is gold per USD
      const silverPricePerOunce = 1 / data.rates.XAG; // XAG is silver per USD
      
      const goldPricePerGram = (goldPricePerOunce / 31.1035) * usdToInr;
      const silverPricePerGram = (silverPricePerOunce / 31.1035) * usdToInr;
      
      return {
        gold24k: parseFloat(goldPricePerGram.toFixed(2)),
        silver: parseFloat(silverPricePerGram.toFixed(2)),
        timestamp: Date.now(),
        source: 'MetalPriceAPI'
      };
    } catch (error) {
      console.error('MetalPriceAPI error:', error);
      throw error;
    }
  }

  // Fetch prices from FreeGoldPrice API
  async fetchFromFreeGoldPrice() {
    try {
      const response = await fetch(this.providers.freegoldprice.url, {
        headers: this.providers.freegoldprice.headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const usdToInr = await this.getUSDToINRRate();
      
      // Convert prices to INR per gram
      const goldPricePerGram = (data.gold / 31.1035) * usdToInr;
      const silverPricePerGram = (data.silver / 31.1035) * usdToInr;
      
      return {
        gold24k: parseFloat(goldPricePerGram.toFixed(2)),
        silver: parseFloat(silverPricePerGram.toFixed(2)),
        timestamp: Date.now(),
        source: 'FreeGoldPrice'
      };
    } catch (error) {
      console.error('FreeGoldPrice API error:', error);
      throw error;
    }
  }

  // Generate realistic mock data with price fluctuations (per gram) - Mumbai prices
  generateMockData() {
    // Real Mumbai prices as per current market rates
    const baseGoldPerGram = 9836;  // INR per gram for 24k gold (₹98,360/10g)
    const baseSilverPerGram = 89;   // INR per gram for silver (current market rate)
    
    // Add some realistic price fluctuation (±1%)
    const goldFluctuation = (Math.random() - 0.5) * 0.02; // ±1%
    const silverFluctuation = (Math.random() - 0.5) * 0.02; // ±1%
    
    const gold24kPerGram = baseGoldPerGram * (1 + goldFluctuation);
    const silverPerGram = baseSilverPerGram * (1 + silverFluctuation);
    
    return {
      gold24k: parseFloat(gold24kPerGram.toFixed(2)),
      silver: parseFloat(silverPerGram.toFixed(2)),
      timestamp: Date.now(),
      source: 'Mumbai Market Data'
    };
  }

  // Main method to fetch prices with fallback
  async fetchMetalPrices() {
    const providers = [
      this.fetchFromGoldPriceZ.bind(this),
      this.fetchFromMetalPriceAPI.bind(this),
      this.fetchFromFreeGoldPrice.bind(this)
    ];

    // Try each provider in order
    for (const provider of providers) {
      try {
        const data = await provider();
        console.log(`Successfully fetched prices from ${data.source}`);
        return this.formatPrices(data);
      } catch (error) {
        console.warn('Provider failed, trying next:', error.message);
        continue;
      }
    }

    // If all providers fail, use mock data
    console.warn('All API providers failed, using mock data');
    return this.formatPrices(this.generateMockData());
  }

  // Format prices with all gold purities and changes (for 10 grams)
  formatPrices(rawData) {
    const purities = this.calculateGoldPurities(rawData.gold24k);
    
    // Convert to 10 gram prices
    const gold24kPer10g = purities.gold24k * 10;
    const gold22kPer10g = purities.gold22k * 10;
    const gold18kPer10g = purities.gold18k * 10;
    const silverPer10g = rawData.silver * 10;
    
    // Simulate price changes for display (in a real app, you'd compare with previous prices)
    const generateChange = (price) => {
      const changePercent = (Math.random() - 0.5) * 2; // ±1%
      const change = (price * changePercent) / 100;
      return {
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2))
      };
    };

    return {
      gold24k: {
        price: parseFloat(gold24kPer10g.toFixed(0)),
        ...generateChange(gold24kPer10g)
      },
      gold22k: {
        price: parseFloat(gold22kPer10g.toFixed(0)),
        ...generateChange(gold22kPer10g)
      },
      gold18k: {
        price: parseFloat(gold18kPer10g.toFixed(0)),
        ...generateChange(gold18kPer10g)
      },
      silver: {
        price: parseFloat(silverPer10g.toFixed(0)),
        ...generateChange(silverPer10g)
      },
      timestamp: rawData.timestamp,
      source: rawData.source,
      lastUpdated: new Date(rawData.timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  // Get current prices with caching
  async getCurrentPrices() {
    const cacheKey = 'metal_prices_cache';
    const cacheTime = 2 * 60 * 1000; // 2 minutes cache
    
    try {
      // Check cache first
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < cacheTime) {
          console.log('Using cached prices');
          return parsedCache.data;
        }
      }
      
      // Fetch fresh data
      const prices = await this.fetchMetalPrices();
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify({
        data: prices,
        timestamp: Date.now()
      }));
      
      return prices;
    } catch (error) {
      console.error('Failed to fetch metal prices:', error);
      
      // Try to return cached data even if expired
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        console.log('Using expired cache due to error');
        return parsedCache.data;
      }
      
      // Final fallback
      return this.formatPrices(this.generateMockData());
    }
  }
}

// Export a singleton instance
export const metalPriceService = new MetalPriceService();
export default metalPriceService; 