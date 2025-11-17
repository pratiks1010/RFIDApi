import React, { useState, useEffect } from 'react';
import metalPriceService from '../../services/metalPriceService';

const LiveMetalTicker = () => {
  const [metalPrices, setMetalPrices] = useState({
    gold24k: { price: 0, change: 0, changePercent: 0 },
    gold22k: { price: 0, change: 0, changePercent: 0 },
    gold18k: { price: 0, change: 0, changePercent: 0 },
    silver: { price: 0, change: 0, changePercent: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [dataSource, setDataSource] = useState('');

  // Fetch gold and silver prices using the service
  const fetchMetalPrices = async () => {
    try {
      setLoading(true);
      setError('');
      
      const priceData = await metalPriceService.getCurrentPrices();
      
      setMetalPrices({
        gold24k: priceData.gold24k,
        gold22k: priceData.gold22k,
        gold18k: priceData.gold18k,
        silver: priceData.silver
      });
      
      setLastUpdated(priceData.lastUpdated);
      setDataSource(priceData.source);
      
    } catch (err) {
      console.error('Error fetching metal prices:', err);
      setError('Failed to fetch metal prices');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and set up interval
  useEffect(() => {
    fetchMetalPrices();
    
    // Update prices every 2 minutes
    const interval = setInterval(fetchMetalPrices, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  if (loading && !metalPrices.gold24k.price) {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e4e7ec',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
        padding: '20px',
        margin: '0 0 24px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '500',
        color: '#667085',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid #0077d4',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '12px'
        }} />
        Loading live gold & silver prices...
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
        padding: '16px 20px',
        margin: '0 0 24px 0',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'center',
        color: '#dc2626',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}>
        <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#dc2626' }}></i>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e4e7ec',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1)',
      padding: '12px 16px',
      margin: '0 0 24px 0',
      overflow: 'hidden',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Live indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginRight: '16px',
        flexShrink: 0
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#10b981',
          animation: 'pulse 2s ease-in-out infinite',
          marginRight: '8px'
        }} />
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#101828',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          LIVE
        </span>
      </div>

      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          animation: 'scroll 40s linear infinite',
          whiteSpace: 'nowrap',
          alignItems: 'center'
        }}>
          {[
            { name: 'GOLD 24K', price: metalPrices.gold24k.price, change: metalPrices.gold24k.change, changePercent: metalPrices.gold24k.changePercent },
            { name: 'GOLD 22K', price: metalPrices.gold22k.price, change: metalPrices.gold22k.change, changePercent: metalPrices.gold22k.changePercent },
            { name: 'GOLD 18K', price: metalPrices.gold18k.price, change: metalPrices.gold18k.change, changePercent: metalPrices.gold18k.changePercent },
            { name: 'SILVER', price: metalPrices.silver.price, change: metalPrices.silver.change, changePercent: metalPrices.silver.changePercent }
          ].concat([
            { name: 'GOLD 24K', price: metalPrices.gold24k.price, change: metalPrices.gold24k.change, changePercent: metalPrices.gold24k.changePercent },
            { name: 'GOLD 22K', price: metalPrices.gold22k.price, change: metalPrices.gold22k.change, changePercent: metalPrices.gold22k.changePercent },
            { name: 'GOLD 18K', price: metalPrices.gold18k.price, change: metalPrices.gold18k.change, changePercent: metalPrices.gold18k.changePercent },
            { name: 'SILVER', price: metalPrices.silver.price, change: metalPrices.silver.change, changePercent: metalPrices.silver.changePercent }
          ]).map((metal, index) => (
            <span key={index} style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginRight: '40px',
              fontSize: '14px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: '500'
            }}>
              <span style={{ 
                color: metal.name.includes('GOLD') ? '#f59e0b' : '#6b7280', 
                fontWeight: '600',
                marginRight: '8px'
              }}>
                {metal.name}
              </span>
              <span style={{ 
                margin: '0 8px', 
                color: '#101828',
                fontWeight: '600'
              }}>
                {formatPrice(metal.price)}/10g
              </span>
              <span style={{
                color: metal.change >= 0 ? '#10b981' : '#dc2626',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <i className={`fas fa-arrow-${metal.change >= 0 ? 'up' : 'down'}`} style={{ fontSize: '10px' }}></i>
                {formatChange(metal.changePercent)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Last updated */}
      <div style={{
        fontSize: '11px',
        color: '#667085',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        marginLeft: '16px',
        flexShrink: 0
      }}>
        {lastUpdated}
      </div>

      <style>
        {`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default LiveMetalTicker; 