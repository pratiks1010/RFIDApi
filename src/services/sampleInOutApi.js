import { toSampleApiUrl } from './apiBaseConfig';

const BASE = '/api/RFIDDashboard/SampleInOut';

/** All Sample In/Out RFIDDashboard routes use `getSampleApiBaseUrl()` (RRGOLD by mode). */
export const sampleInOutDashboardUrl = (relativeAction) => {
  const suffix = relativeAction.startsWith('/') ? relativeAction : `/${relativeAction}`;
  const fullPath = `${BASE}${suffix}`;
  return toSampleApiUrl(fullPath);
};

/** Maps UI party key to API enum */
export const partyTypeToApiEnum = (partyType) =>
  partyType === 'customer'
    ? 'Customer'
    : partyType === 'vendor'
      ? 'Vendor'
      : 'Employee';

export const getSampleOutNextNumberUrl = () => sampleInOutDashboardUrl('/GetSampleOutNextNumber');

export const getCreateSampleOutUrl = () => sampleInOutDashboardUrl('/CreateSampleOut');

export const getCreateSampleInUrl = () => sampleInOutDashboardUrl('/CreateSampleIn');

export const getSampleLotByNoUrl = () => sampleInOutDashboardUrl('/GetSampleLotByNo');

export const getSampleLotItemsUrl = () => sampleInOutDashboardUrl('/GetSampleLotItems');

export const getPendingItemsUrl = () => sampleInOutDashboardUrl('/GetPendingItems');

export const getSampleOutLotsUrl = () => sampleInOutDashboardUrl('/GetSampleOutLots');

/** Pending sample-out lot numbers for a party (`PendingItems > 0`). Body: `PartyPendingSampleLotsRequest`. */
export const getPendingSampleOutLotNosByPartyUrl = () =>
  sampleInOutDashboardUrl('/GetPendingSampleOutLotNosByParty');

/**
 * All sample-out lots with line details per lot (`SampleLotWithItemsDetailResponse[]` in `Data`):
 * `Header`, `BranchName` (lot), `Items` (SampleOutItemDetailResponse[]).
 *
 * Sample-in rows inside `Items`: `ItemStatus === "Returned"` and/or `InDate` set; still out: `Out` + `InDate` null.
 *
 * Request body (POST): `{ ClientCode }` required. Optional: `Status` (`"PartialReturned"` | `"Closed"`),
 * `PartyType`, `PartyId`, `BranchId`, `FromDate`, `ToDate`.
 */
export const getAllSampleOutListUrl = () => sampleInOutDashboardUrl('/GetAllSampleOutList');

export const getSampleReportUrl = () => sampleInOutDashboardUrl('/GetSampleReport');

export const getSampleInOutAllCustomersUrl = () => sampleInOutDashboardUrl('/GetAllCustomers');

export const getSampleInOutAllVendorsUrl = () => sampleInOutDashboardUrl('/GetAllVendors');

export const getSampleInOutAllEmployeesUrl = () => sampleInOutDashboardUrl('/GetAllEmployees');
