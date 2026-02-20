import axios from 'axios';

const AUTH_TOKEN = (process.env.REACT_APP_TAMANNAAH_BS_AUTH_TOKEN || 'EC3276D0-6700-4B2A-82D4-A1C028827625').trim();

const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
const GATI_BASE = process.env.REACT_APP_TAMANNAAH_BS_API_URL || (isHttps ? '' : 'http://3.109.131.101:816');
const baseURL = GATI_BASE ? `${GATI_BASE.replace(/\/$/, '')}/api/TamannaahBS` : '/api/TamannaahBS';

const gatiHeaders = () => ({
  'Content-Type': 'application/json',
  AuthorizationToken: AUTH_TOKEN,
});

export const getTestService = async () => {
  const { data } = await axios.get(`${baseURL}/TestService`, {
    timeout: 30000,
    headers: gatiHeaders(),
  });
  return data;
};

export const getStockOnHand = async () => {
  const { data } = await axios.get(`${baseURL}/GetStockOnHand`, {
    timeout: 30000,
    headers: gatiHeaders(),
  });
  return data;
};

export const hasGatiAuthToken = () => !!AUTH_TOKEN;
