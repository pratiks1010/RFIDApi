import axios from 'axios';
import { getPasskeyApiBaseUrl } from './authApiConfig';

const BASE = () => getPasskeyApiBaseUrl();

const bearerHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export function base64UrlToBuffer(base64url) {
  if (!base64url || typeof base64url !== 'string') return null;
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const str = atob(base64);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i);
  return out.buffer;
}

export function bufferToBase64Url(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Map Fido2 CredentialCreateOptions JSON to browser PublicKeyCredentialCreationOptions.
 */
export function toPublicKeyCreationOptions(serverOptions) {
  const o = serverOptions || {};
  const challenge = o.challenge ?? o.Challenge;
  const user = o.user ?? o.User;
  const rp = o.rp ?? o.Rp;
  const excludeCredentials = (o.excludeCredentials ?? o.ExcludeCredentials ?? []).map((cred) => ({
    type: cred.type || 'public-key',
    id: typeof cred.id === 'string' ? base64UrlToBuffer(cred.id) : cred.id,
    transports: cred.transports ?? cred.Transports,
  }));

  return {
    ...o,
    rp,
    challenge: typeof challenge === 'string' ? base64UrlToBuffer(challenge) : challenge,
    user: user
      ? {
          ...user,
          name: user.name ?? user.Name,
          displayName: user.displayName ?? user.DisplayName,
          id: typeof (user.id ?? user.Id) === 'string' ? base64UrlToBuffer(user.id ?? user.Id) : (user.id ?? user.Id),
        }
      : user,
    excludeCredentials: excludeCredentials.length ? excludeCredentials : undefined,
    pubKeyCredParams: o.pubKeyCredParams ?? o.PubKeyCredParams,
    timeout: o.timeout ?? o.Timeout,
    attestation: o.attestation ?? o.Attestation,
    authenticatorSelection: o.authenticatorSelection ?? o.AuthenticatorSelection,
    extensions: o.extensions ?? o.Extensions,
  };
}

/**
 * Map Fido2 AssertionOptions to browser PublicKeyCredentialRequestOptions.
 */
export function toPublicKeyRequestOptions(serverOptions) {
  const o = serverOptions || {};
  const challenge = o.challenge ?? o.Challenge;
  const allowCredentials = (o.allowCredentials ?? o.AllowCredentials ?? []).map((cred) => ({
    type: cred.type || 'public-key',
    id: typeof cred.id === 'string' ? base64UrlToBuffer(cred.id) : cred.id,
    transports: cred.transports ?? cred.Transports,
  }));

  return {
    ...o,
    challenge: typeof challenge === 'string' ? base64UrlToBuffer(challenge) : challenge,
    allowCredentials: allowCredentials.length ? allowCredentials : undefined,
    timeout: o.timeout ?? o.Timeout,
    rpId: o.rpId ?? o.RpId,
    userVerification: o.userVerification ?? o.UserVerification,
    extensions: o.extensions ?? o.Extensions,
  };
}

export function attestationResponseToApiShape(credential) {
  const response = credential.response;
  const clientExtensionResults = credential.getClientExtensionResults
    ? credential.getClientExtensionResults()
    : {};

  return {
    Id: credential.id,
    RawId: bufferToBase64Url(credential.rawId),
    Type: credential.type,
    // Required by ASP.NET/Fido2 models when JsonSerializerOptions.PropertyNamingPolicy = null
    ClientExtensionResults: clientExtensionResults || {},
    Response: {
      ClientDataJSON: bufferToBase64Url(response.clientDataJSON),
      AttestationObject: bufferToBase64Url(response.attestationObject),
      Transports: response.getTransports?.(),
    },
  };
}

export function assertionResponseToApiShape(credential) {
  const response = credential.response;
  const clientExtensionResults = credential.getClientExtensionResults
    ? credential.getClientExtensionResults()
    : {};

  return {
    Id: credential.id,
    RawId: bufferToBase64Url(credential.rawId),
    Type: credential.type,
    // Keep consistent with attestation model requirements.
    ClientExtensionResults: clientExtensionResults || {},
    Response: {
      AuthenticatorData: bufferToBase64Url(response.authenticatorData),
      ClientDataJSON: bufferToBase64Url(response.clientDataJSON),
      Signature: bufferToBase64Url(response.signature),
      UserHandle:
        response.userHandle && response.userHandle.byteLength
          ? bufferToBase64Url(response.userHandle)
          : null,
    },
  };
}

/** POST /api/auth/passkey/register/options — requires JWT */
export const fetchPasskeyRegisterOptions = async (friendlyName = '') => {
  const res = await axios.post(
    `${BASE()}/api/auth/passkey/register/options`,
    { FriendlyName: friendlyName || '' },
    { headers: bearerHeaders() }
  );
  return res.data;
};

/** POST /api/auth/passkey/register/verify — requires JWT */
export const verifyPasskeyRegistration = async ({ sessionId, friendlyName, credential }) => {
  const res = await axios.post(
    `${BASE()}/api/auth/passkey/register/verify`,
    {
      SessionId: sessionId,
      FriendlyName: friendlyName || '',
      AttestationResponse: attestationResponseToApiShape(credential),
    },
    { headers: bearerHeaders() }
  );
  return res.data;
};

/** POST /api/auth/passkey/login/options — no JWT */
export const fetchPasskeyLoginOptions = async ({ loginName, clientCode }) => {
  const res = await axios.post(`${BASE()}/api/auth/passkey/login/options`, {
    LoginName: loginName,
    ClientCode: clientCode,
  });
  return res.data;
};

/** POST /api/auth/passkey/login/verify — no JWT */
export const verifyPasskeyLogin = async ({ sessionId, credential }) => {
  const res = await axios.post(`${BASE()}/api/auth/passkey/login/verify`, {
    SessionId: sessionId,
    AssertionResponse: assertionResponseToApiShape(credential),
  });
  return res.data;
};

/** GET /api/auth/passkey/list — requires JWT */
export const listPasskeys = async () => {
  const res = await axios.get(`${BASE()}/api/auth/passkey/list`, { headers: bearerHeaders() });
  return res.data;
};

/** POST /api/auth/passkey/remove — requires JWT */
export const removePasskey = async (passkeyId) => {
  const res = await axios.post(
    `${BASE()}/api/auth/passkey/remove`,
    { PasskeyId: passkeyId },
    { headers: bearerHeaders() }
  );
  return res.data;
};

export const extractJwtFromLoginPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return payload.token || payload.Token || payload.data?.token || payload.data?.Token || null;
};
