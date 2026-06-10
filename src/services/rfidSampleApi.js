import { toSoniApiUrl } from './apiBaseConfig';

const RFID_SAMPLE_BASE = '/api/RFIDSample';
const RFID_USER_BASE = '/api/RFIDUserManagement';

/**
 * RFID Sample Out/In APIs — Soni host (online/offline via REACT_APP_API_MODE + SONI URLs).
 * Override online: REACT_APP_API_URL / REACT_APP_SONI_API_BASE_URL
 * Override offline: REACT_APP_SONI_API_BASE_OFFLINE_URL (default http://localhost:8080)
 */
export const rfidSampleUrl = (relativePath) => {
  const suffix = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return toSoniApiUrl(`${RFID_SAMPLE_BASE}${suffix}`);
};

export const getSubmitSampleOutUrl = () => rfidSampleUrl('/SubmitSampleOut');

/** Preview next lot (does not increment). Query: clientCode= */
export const getLastNextSampleLotNumberUrl = () => rfidSampleUrl('/GetLastNextSampleLotNumber');

/** Alternate preview endpoint */
export const getNextLotNumberUrl = () => rfidSampleUrl('/GetNextLotNumber');

export const getLookupProductByRfidUrl = () => rfidSampleUrl('/LookupProductByRfid');

/** Live scan: 1st scan = Sample Out, 2nd scan (already out) = Sample In. */
export const getCheckScanStatusUrl = () => rfidSampleUrl('/CheckScanStatus');

export const getScanSampleInUrl = () => rfidSampleUrl('/ScanSampleIn');

export const getScanTagUrl = () => rfidSampleUrl('/ScanTag');

export const getPartyLookupUrl = (partyType, clientCode = '') => {
  const q = new URLSearchParams();
  q.set('partyType', String(partyType || '').trim());
  const cc = String(clientCode || '').trim();
  if (cc) q.set('clientCode', cc);
  return rfidSampleUrl(`/GetPartyLookup?${q.toString()}`);
};

/** Dashboard sub-users for Assign To (employee login / guid). */
export const getAllSubUsersUrl = () => toSoniApiUrl(`${RFID_USER_BASE}/GetAllSubUsers`);

export const sampleAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export const getMyAssignedLotsUrl = (clientCode, lotStatus = 'PendingAcceptance') =>
  rfidSampleUrl(
    `/GetMyAssignedLots?clientCode=${encodeURIComponent(clientCode || '')}&lotStatus=${encodeURIComponent(lotStatus)}`
  );

export const getLotByIdUrl = (clientCode, lotId) =>
  rfidSampleUrl(
    `/GetLotById?clientCode=${encodeURIComponent(clientCode || '')}&lotId=${encodeURIComponent(lotId)}`
  );

/** Whether assigned employee accepted the lot and returns are allowed. */
export const getLotAcceptanceStatusUrl = (clientCode, lotId) =>
  rfidSampleUrl(
    `/GetLotAcceptanceStatus?clientCode=${encodeURIComponent(clientCode || '')}&lotId=${encodeURIComponent(lotId)}`
  );

export const getAcceptLotUrl = () => rfidSampleUrl('/AcceptLot');

/** All sample-out lots with line items (admin list; sub-user sees assigned only). */
export const getAllSampleOutListUrl = () => rfidSampleUrl('/GetAllSampleOutList');

export const getLotListUrl = () => rfidSampleUrl('/GetLotList');

export const buildGetAllSampleOutListQuery = ({
  clientCode,
  pageNumber = 1,
  pageSize = 50,
  lotStatus,
  partyType,
  assignedToUserId,
  search,
} = {}) => {
  const q = new URLSearchParams();
  if (clientCode) q.set('clientCode', clientCode);
  q.set('pageNumber', String(pageNumber));
  q.set('pageSize', String(pageSize));
  if (lotStatus) q.set('lotStatus', lotStatus);
  if (partyType) q.set('partyType', partyType);
  if (assignedToUserId) q.set('assignedToUserId', assignedToUserId);
  if (search) q.set('search', search);
  const qs = q.toString();
  return `${getAllSampleOutListUrl()}?${qs}`;
};
