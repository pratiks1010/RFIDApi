import { toRrgoldApiUrl } from './apiBaseConfig';

export const getGetAllCustomerUrl = () => toRrgoldApiUrl('/api/ClientOnboarding/GetAllCustomer');
export const getAddCustomerUrl = () => toRrgoldApiUrl('/api/ClientOnboarding/AddCustomer');

export function validateSidebarCustomerForm(form) {
  if (!String(form?.firstName || '').trim()) return 'First Name is required.';
  if (!String(form?.lastName || '').trim()) return 'Last Name is required.';
  if (!String(form?.contactNumber || '').trim()) return 'Mobile is required.';
  if (!String(form?.country || '').trim()) return 'Country is required.';
  if (!String(form?.state || '').trim()) return 'State is required.';
  const pin = String(form?.pincode || '').replace(/\D/g, '');
  if (pin && pin.length !== 6) return 'Pincode must be 6 digits.';
  return null;
}

/** Same shape as CreateMasters AddCustomer payload. */
export function buildAddCustomerPayloadFromSidebar(form, clientCode) {
  const pin = String(form.pincode || '').replace(/\D/g, '').slice(0, 6);
  const mobileDigits = String(form.contactNumber || '').replace(/\D/g, '');
  return {
    ClientCode: clientCode,
    FirstName: String(form.firstName || '').trim(),
    LastName: String(form.lastName || '').trim(),
    CompanyName: String(form.companyName || '').trim(),
    Email: String(form.email || '').trim(),
    Mobile: mobileDigits,
    AadharNumber: String(form.aadharNumber ?? '0').trim() || '0',
    PanNumber: String(form.panNumber || '').trim(),
    Remarks: String(form.remarks || '').trim(),
    Street: String(form.street || '').trim(),
    Area: String(form.area || '').trim(),
    Town: String(form.town || '').trim(),
    City: String(form.city || '').trim(),
    Country: form.country || 'India',
    State: String(form.state || '').trim(),
    Pincode: pin,
  };
}
