import { getAuthForgotPasswordUrl } from './authApiConfig';

/**
 * POST /api/ProductMaster/AuthForgotPassword (public — no Bearer token)
 * Change password for parent account or RFID dashboard sub-user.
 */
export const changeAuthPassword = async ({
  loginName,
  clientCode,
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const body = {
    loginName: String(loginName || '').trim(),
    clientCode: String(clientCode || '').trim().toUpperCase(),
    currentPassword: String(currentPassword || ''),
    newPassword: String(newPassword || ''),
  };

  if (confirmPassword !== undefined && confirmPassword !== null && String(confirmPassword).length > 0) {
    body.confirmPassword = String(confirmPassword);
  }

  const res = await fetch(getAuthForgotPasswordUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    const message =
      data.message ||
      data.Message ||
      (Array.isArray(data) ? data.map((x) => x?.description || x?.code).filter(Boolean).join(' ') : null) ||
      (typeof data === 'string' ? data : null) ||
      'Unable to change password.';
    const err = new Error(message);
    err.response = { data, status: res.status };
    throw err;
  }

  return {
    success: data.success !== false,
    message:
      data.message ||
      data.Message ||
      'Password changed successfully. Please login with your new password.',
    userName: data.userName || data.UserName || body.loginName,
    clientCode: data.clientCode || data.ClientCode || body.clientCode,
  };
};

export default changeAuthPassword;
