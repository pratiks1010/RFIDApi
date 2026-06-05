import { getSoniApiBaseUrl } from './apiBaseConfig';

/**
 * Primary RFID / ProductMaster API host.
 * Override: REACT_APP_API_URL, VITE_API_URL, or REACT_APP_AUTH_API_BASE_URL.
 * Default local Kestrel: https://localhost:7095
 */
export const getRfidApiBaseUrl = () =>
  (
    process.env.REACT_APP_API_URL ||
    process.env.VITE_API_URL ||
    process.env.REACT_APP_AUTH_API_BASE_URL ||
    'https://localhost:7095' ||
    getSoniApiBaseUrl()
  ).replace(/\/$/, '');

/**
 * Password login host (ProductMaster). Uses same base as RFID APIs.
 */
export const getAuthApiBaseUrl = () => getRfidApiBaseUrl();

export const getAuthLoginUrl = () => `${getAuthApiBaseUrl()}/api/ProductMaster/AuthLogin`;
export const getAuthForgotPasswordUrl = () => `${getAuthApiBaseUrl()}/api/ProductMaster/AuthForgotPassword`;

/**
 * Local ASP.NET Kestrel default for /api/auth/fingerprint/* and /api/auth/passkey/*.
 * Override: REACT_APP_FINGERPRINT_API_BASE_URL / REACT_APP_PASSKEY_API_BASE_URL
 * (e.g. production: https://soni.loyalstring.co.in).
 */
const DEFAULT_LOCAL_AUTH_API_BASE = 'https://localhost:7095';

/** Fingerprint APIs (/api/auth/fingerprint/*). */
export const getFingerprintApiBaseUrl = () =>
  (process.env.REACT_APP_FINGERPRINT_API_BASE_URL || DEFAULT_LOCAL_AUTH_API_BASE).replace(/\/$/, '');

/** Passkey APIs (/api/auth/passkey/*). */
export const getPasskeyApiBaseUrl = () =>
  (process.env.REACT_APP_PASSKEY_API_BASE_URL || DEFAULT_LOCAL_AUTH_API_BASE).replace(/\/$/, '');

/** Face auth APIs (/api/auth/face/*). */
export const getFaceAuthApiBaseUrl = () =>
  (process.env.REACT_APP_FACE_AUTH_API_BASE_URL || getAuthApiBaseUrl()).replace(/\/$/, '');
