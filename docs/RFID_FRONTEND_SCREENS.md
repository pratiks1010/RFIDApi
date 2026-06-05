# RFID dashboard — frontend screens & APIs

## Roles

| Role | Login | Sidebar |
|------|-------|---------|
| Admin | `POST /api/ProductMaster/AuthLogin` → `IsSubUser: false` | Full menu |
| Sub-user | Same API → `IsSubUser: true`, `permissions: { canSampleIn, ... }` | Filtered by permissions + **My Samples** |

Sub-user home route: `/my-samples`. Admin home: `/analytics`.

## Admin — RFID Users (`/rfid-admin/users`)

| Action | API |
|--------|-----|
| List sub-users | `GET /api/RFIDUserManagement/GetAllSubUsers` |
| List employees to convert | `POST /api/RFIDUserManagement/GetEmployeesForSubUser` |
| Convert | `POST /api/RFIDUserManagement/ConvertEmployeeToSubUser` |
| Permissions | `GET GetAvailableModules`, `POST UpdateModulePermissions` |

Use `userId` (GUID) from `GetAllSubUsers` for Sample Out `AssignedToUserId`.

## Sample Out (admin, `canSampleOut`)

1. `GET GetLastNextSampleLotNumber?clientCode=` — preview lot no.
2. Pick **party** (customer/vendor).
3. Pick **assign to sub-user** (`userId` GUID).
4. `POST SubmitSampleOut` with `AssignedToUserId`.

## Sub-user — My Samples (`/my-samples`)

| Action | API |
|--------|-----|
| List pending | `GET GetMyAssignedLots?clientCode=&lotStatus=PendingAcceptance` |
| Detail | `GET GetLotById?clientCode=&lotId=` |
| Accept | `POST AcceptLot` `{ ClientCode, LotId, AcceptedRemark }` |

## Sub-user — Sample In (`canSampleIn`)

Use existing `/sample-in` when permission is granted.

## Sample Out List (`/sample-out-list`)

| Action | API |
|--------|-----|
| List with items | `POST /api/RFIDSample/GetAllSampleOutList` |
| Lot detail | `GET GetLotById?clientCode=&lotId=` |

Sub-users only see lots assigned to them. Draft/Cancelled excluded.

## Permission → sidebar

See `src/constants/sidebarMenu.js` and `filterMenuItems()` in `src/utils/permissionAccess.js`.

Suggested sub-user flags: `canSampleIn: true`, `canSampleOut: false`, `canManageUsers: false`.
