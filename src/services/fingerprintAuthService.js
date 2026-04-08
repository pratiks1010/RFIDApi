import axios from 'axios';
import { getFingerprintApiBaseUrl } from './authApiConfig';

const FINGERPRINT_API_BASE_URL = getFingerprintApiBaseUrl();
const RD_SERVICE_BASE_URL = process.env.REACT_APP_RD_SERVICE_BASE_URL || 'https://localhost:11100';
const RD_PROXY_BASE_URL = process.env.REACT_APP_RD_SERVICE_PROXY_BASE_URL || '/rd-local';
const RD_BRIDGE_ENDPOINT = process.env.REACT_APP_RD_BRIDGE_ENDPOINT || `${RD_PROXY_BASE_URL}/bridge`;
const RD_USE_DIRECT = String(process.env.REACT_APP_RD_USE_DIRECT || '').toLowerCase() === 'true';

const unwrapResponseData = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  const inner = payload.data ?? payload.Data;
  if (inner !== undefined && inner !== null) return inner;
  return payload;
};

const rdRequest = async ({ method, path, data, headers }) => {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  if (RD_USE_DIRECT) {
    const response = await axios.request({
      method: normalizedMethod,
      url: `${RD_SERVICE_BASE_URL}${path}`,
      data,
      headers: {
        Accept: 'text/xml, application/xml, text/plain, */*',
        ...headers,
      },
      timeout: 15000,
    });
    return response.data;
  }

  const bridgeResponse = await axios.post(
    RD_BRIDGE_ENDPOINT,
    {
      method: normalizedMethod,
      path,
      data,
      headers: {
        Accept: 'text/xml, application/xml, text/plain, */*',
        ...headers,
      },
    },
    { timeout: 20000 }
  );

  const payload = bridgeResponse.data || {};
  if (payload.error) {
    const details = Array.isArray(payload.attempts) ? ` | attempts: ${payload.attempts.join(' ; ')}` : '';
    throw new Error(`${payload.error}${details}`);
  }
  if (payload.statusCode && payload.statusCode !== 200) {
    throw new Error(`RD service error ${payload.statusCode}`);
  }
  return payload.data;
};

const tryRdPaths = async (method, paths, requestOptions = {}) => {
  let lastError;
  for (let i = 0; i < paths.length; i += 1) {
    try {
      const data = await rdRequest({
        method,
        path: paths[i],
        data: requestOptions.data,
        headers: requestOptions.headers,
      });
      return { path: paths[i], data };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Unable to reach RD service endpoint.');
};

export const getFingerprintStatus = async ({ loginName, clientCode }) => {
  const response = await axios.get(`${FINGERPRINT_API_BASE_URL}/api/auth/fingerprint/status`, {
    params: { LoginName: loginName, ClientCode: clientCode },
  });
  return unwrapResponseData(response.data);
};

export const createFingerprintChallenge = async ({ loginName, clientCode }) => {
  const response = await axios.post(`${FINGERPRINT_API_BASE_URL}/api/auth/fingerprint/challenge`, {
    LoginName: loginName,
    ClientCode: clientCode,
  });
  return unwrapResponseData(response.data);
};

export const getRdServiceStatus = async () => {
  const result = await tryRdPaths('RDSERVICE', ['/', '/rdservice']);
  return result;
};

export const getRdDeviceInfo = async () => {
  const result = await tryRdPaths('DEVICEINFO', ['/getDeviceInfo', '/getDeviceinfo']);
  return result;
};

export const parseRdXmlSummary = (xmlText) => {
  const text = String(xmlText || '').trim();
  if (!text) return { errCode: '', errInfo: '', deviceInfo: '', pidDataType: '', raw: '' };

  try {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    const resp = doc.querySelector('Resp');
    const deviceInfoNode = doc.querySelector('DeviceInfo');
    const skeyNode = doc.querySelector('Skey');
    const hmacNode = doc.querySelector('Hmac');
    const dataNode = doc.querySelector('Data');

    return {
      errCode: resp?.getAttribute('errCode') || '',
      errInfo: resp?.getAttribute('errInfo') || '',
      deviceInfo: deviceInfoNode ? new XMLSerializer().serializeToString(deviceInfoNode) : '',
      pidDataType: dataNode?.getAttribute('type') || '',
      skeyCi: skeyNode?.getAttribute('ci') || '',
      hmac: hmacNode ? (hmacNode.textContent || '').trim() : '',
      data: dataNode ? (dataNode.textContent || '').trim() : '',
      raw: text,
    };
  } catch (err) {
    return {
      errCode: '',
      errInfo: '',
      deviceInfo: '',
      pidDataType: '',
      raw: text,
    };
  }
};

export const captureRdFingerprint = async ({
  env = 'P',
  fCount = 1,
  fType = 0,
  format = 0,
  pidVer = '2.0',
  timeout = 10000,
  wadh = '',
  posh = '',
  otp = '',
} = {}) => {
  const pidOptionsXml = `<PidOptions ver="1.0"><Opts env="${env}" fCount="${fCount}" fType="${fType}" format="${format}" pidVer="${pidVer}" timeout="${timeout}" otp="${otp}" wadh="${wadh}" posh="${posh}"/></PidOptions>`;

  const captureResult = await tryRdPaths(
    'CAPTURE',
    ['/capture', '/rd/capture'],
    { data: pidOptionsXml, headers: { 'Content-Type': 'text/xml' } }
  );
  const responseText = captureResult.data;

  const parsed = parseRdXmlSummary(responseText);
  if (parsed.errCode && parsed.errCode !== '0') {
    throw new Error(parsed.errInfo || `Capture failed with errCode ${parsed.errCode}`);
  }

  return {
    pidOptionsXml,
    rawResponse: String(responseText || ''),
    parsed,
  };
};

export const verifyLogin = async (payload) => {
  const response = await axios.post(`${FINGERPRINT_API_BASE_URL}/api/auth/fingerprint/verify-capture`, {
    LoginName: payload.loginName,
    ClientCode: payload.clientCode,
    ChallengeId: payload.challengeId,
    PidXml: payload.pidXml,
    DeviceInfoXml: payload.deviceInfoXml,
  });
  return unwrapResponseData(response.data);
};

export const completeFingerprintLogin = async (payload) => {
  const response = await axios.post(`${FINGERPRINT_API_BASE_URL}/api/auth/fingerprint/complete-login`, {
    LoginName: payload.loginName,
    TransactionId: payload.transactionId,
    Otp: payload.otp,
    Pin: payload.pin,
  });
  return unwrapResponseData(response.data);
};

export const registerCredential = async (payload) => {
  const response = await axios.post(`${FINGERPRINT_API_BASE_URL}/api/auth/fingerprint/register`, {
    LoginName: payload.loginName,
    ClientCode: payload.clientCode,
    DeviceName: payload.deviceName,
    FriendlyDeviceName: payload.friendlyDeviceName,
    PidXml: payload.pidXml,
    DeviceInfoXml: payload.deviceInfoXml,
    BranchId: payload.branchId,
    EmployeeId: payload.employeeId,
    Pin: payload.pin,
  });
  return unwrapResponseData(response.data);
};

export const setFingerprintStatus = async ({ loginName, enabled, clientCode }) => {
  const response = await axios.post(`${FINGERPRINT_API_BASE_URL}/api/auth/fingerprint/set-status`, {
    LoginName: loginName,
    IsEnabled: !!enabled,
    ClientCode: clientCode,
  });
  return unwrapResponseData(response.data);
};

/** Back-compat stub for older imports / hot-reload. */
export const isFingerprintEnabledForLogin = () => false;
