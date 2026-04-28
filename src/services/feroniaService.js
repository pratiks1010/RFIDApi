import axios from 'axios';

const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
const FERONIA_BASE = process.env.REACT_APP_FERONIA_API_URL || (isHttps ? '' : 'http://192.168.29.245:83');
const baseURL = FERONIA_BASE
  ? `${FERONIA_BASE.replace(/\/$/, '')}/sjedataservice.asmx`
  : '/api/Feronia';

export const getFeroniaStockData = async () => {
  const { data } = await axios.get(`${baseURL}/getTAGIT_StockData`, {
    timeout: 45000,
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });
  return data;
};

export const getFeroniaBaseUrl = () => baseURL;
