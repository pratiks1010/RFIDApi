import { getSoniApiBaseUrl } from './apiBaseConfig';

/**
 * Primary RFID / ProductMaster API host.
 * Override: REACT_APP_API_URL, VITE_API_URL, or REACT_APP_AUTH_API_BASE_URL.
 * Default: Soni base from apiBaseConfig (online/offline mode).
 */
export const getRfidApiBaseUrl = () =>
  (
    process.env.REACT_APP_API_URL ||
    process.env.VITE_API_URL ||
    process.env.REACT_APP_AUTH_API_BASE_URL ||
    getSoniApiBaseUrl()
  ).replace(/\/$/, '');

/**
 * Password login host (ProductMaster). Uses same base as RFID APIs.
 */
export const getAuthApiBaseUrl = () => getRfidApiBaseUrl();

export const getAuthLoginUrl = () => `${getAuthApiBaseUrl()}/api/ProductMaster/AuthLogin`;
export const getAuthForgotPasswordUrl = () => `${getAuthApiBaseUrl()}/api/ProductMaster/AuthForgotPassword`;

/**
 * Fingerprint / passkey auth APIs (/api/auth/fingerprint/*, /api/auth/passkey/*).
 * Override: REACT_APP_FINGERPRINT_API_BASE_URL / REACT_APP_PASSKEY_API_BASE_URL
 */
/** Fingerprint APIs (/api/auth/fingerprint/*). */
export const getFingerprintApiBaseUrl = () =>
  (process.env.REACT_APP_FINGERPRINT_API_BASE_URL || getRfidApiBaseUrl()).replace(/\/$/, '');

/** Passkey APIs (/api/auth/passkey/*). */
export const getPasskeyApiBaseUrl = () =>
  (process.env.REACT_APP_PASSKEY_API_BASE_URL || getRfidApiBaseUrl()).replace(/\/$/, '');

/** Face auth APIs (/api/auth/face/*). */
export const getFaceAuthApiBaseUrl = () =>
  (process.env.REACT_APP_FACE_AUTH_API_BASE_URL || getAuthApiBaseUrl()).replace(/\/$/, '');
