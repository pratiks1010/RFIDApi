# Fingerprint Authentication API Integration Guide

This document provides one complete reference for:
- DB table creation for fingerprint auth
- all backend fingerprint APIs (request/response + validation)
- frontend integration flow
- how this works with your current username/password login API

---

## 1) Current Login API (unchanged)

Your existing login endpoint is still working and not modified:

- **POST** `/api/ProductMaster/AuthLogin`

### Request
```json
{
  "LoginName": "monty",
  "Password": "UserPassword@123"
}
```

### Success Response (example)
```json
{
  "Token": "jwt-token",
  "IsSubUser": false,
  "RoleType": "SuperAdmin",
  "Permissions": {},
  "AllowedBranchIds": null,
  "HasAllBranchAccess": true
}
```

---

## 2) Fingerprint API Base

- **Base path:** `/api/auth/fingerprint`
- **Content-Type:** `application/json`
- **Rule:** Fingerprint capture alone does not directly log in user. PIN/OTP second factor is required in `complete-login`.

---

## 3) Database Create Script (SQL Server)

```sql
CREATE TABLE [dbo].[tblUserFingerprintSettings](
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [UserId] NVARCHAR(450) NULL,
    [LoginName] NVARCHAR(256) NULL,
    [ClientCode] NVARCHAR(100) NULL,
    [IsFingerprintEnabled] BIT NOT NULL DEFAULT(0),
    [PreferredSecondFactor] NVARCHAR(30) NULL,
    [PinHash] NVARCHAR(MAX) NULL,
    [CreatedOn] DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    [LastUpdated] DATETIME2 NULL,
    [StatusType] BIT NOT NULL DEFAULT(1)
);

CREATE TABLE [dbo].[tblFingerprintDevice](
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [UserId] NVARCHAR(450) NULL,
    [LoginName] NVARCHAR(256) NULL,
    [DeviceSerialNumber] NVARCHAR(200) NULL,
    [DeviceType] NVARCHAR(200) NULL,
    [ProviderName] NVARCHAR(200) NULL,
    [RdsId] NVARCHAR(100) NULL,
    [RdsVersion] NVARCHAR(100) NULL,
    [DpId] NVARCHAR(100) NULL,
    [FriendlyDeviceName] NVARCHAR(200) NULL,
    [IsAllowed] BIT NOT NULL DEFAULT(1),
    [CreatedOn] DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    [LastUpdated] DATETIME2 NULL,
    [StatusType] BIT NOT NULL DEFAULT(1)
);

CREATE TABLE [dbo].[tblFingerprintAuditLog](
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [UserId] NVARCHAR(450) NULL,
    [LoginName] NVARCHAR(256) NULL,
    [ActionType] NVARCHAR(80) NULL,
    [DeviceSerialNumber] NVARCHAR(200) NULL,
    [QualityScore] INT NULL,
    [NmPoints] INT NULL,
    [ErrCode] INT NULL,
    [ErrInfo] NVARCHAR(500) NULL,
    [PidXml] NVARCHAR(MAX) NULL,
    [DeviceInfoXml] NVARCHAR(MAX) NULL,
    [IpAddress] NVARCHAR(100) NULL,
    [MachineName] NVARCHAR(500) NULL,
    [ClientCode] NVARCHAR(100) NULL,
    [CreatedOn] DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);

CREATE TABLE [dbo].[tblAuthChallenge](
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [UserId] NVARCHAR(450) NULL,
    [LoginName] NVARCHAR(256) NULL,
    [ClientCode] NVARCHAR(100) NULL,
    [ChallengeId] NVARCHAR(100) NOT NULL,
    [ChallengeType] NVARCHAR(80) NULL,
    [ExpiresOn] DATETIME2 NOT NULL,
    [IsUsed] BIT NOT NULL DEFAULT(0),
    [CreatedOn] DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);

CREATE TABLE [dbo].[tblAuthTransaction](
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [UserId] NVARCHAR(450) NULL,
    [LoginName] NVARCHAR(256) NULL,
    [TransactionId] NVARCHAR(100) NOT NULL,
    [TransactionType] NVARCHAR(80) NULL,
    [ExpiresOn] DATETIME2 NOT NULL,
    [IsCompleted] BIT NOT NULL DEFAULT(0),
    [CreatedOn] DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);

CREATE INDEX IX_tblAuthChallenge_User_Challenge
ON [dbo].[tblAuthChallenge]([UserId], [ChallengeId], [ClientCode], [IsUsed]);

CREATE INDEX IX_tblAuthTransaction_User_Txn
ON [dbo].[tblAuthTransaction]([UserId], [TransactionId], [IsCompleted]);

CREATE INDEX IX_tblFingerprintDevice_User_Serial
ON [dbo].[tblFingerprintDevice]([UserId], [DeviceSerialNumber]);
```

---

## 4) API: Register Fingerprint

- **POST** `/api/auth/fingerprint/register`

### Purpose
Save user fingerprint setting and device info after a valid RD capture (`errCode == 0`).

### Request
```json
{
  "LoginName": "monty",
  "ClientCode": "LS000410",
  "DeviceName": "Morpho USB Device",
  "FriendlyDeviceName": "My Morpho Device",
  "PidXml": "<PidData>...</PidData>",
  "DeviceInfoXml": "<DeviceInfo ... />",
  "BranchId": 1,
  "EmployeeId": 101,
  "Pin": "4589"
}
```

### Success Response
```json
{
  "success": true,
  "message": "Fingerprint capture registered successfully.",
  "data": {
    "loginName": "monty",
    "isEnabled": true,
    "deviceSerialNumber": "2536I005530",
    "qualityScore": 67,
    "nmPoints": 27
  }
}
```

### Validation
- LoginName, ClientCode, PidXml required
- user + client mapping must exist
- PID XML must parse
- `errCode` must be 0

---

## 5) API: Create Login Challenge

- **POST** `/api/auth/fingerprint/challenge`

### Purpose
Generate one-time challenge before capture verification.

### Request
```json
{
  "LoginName": "monty",
  "ClientCode": "LS000410"
}
```

### Success Response
```json
{
  "success": true,
  "data": {
    "challengeId": "chlg_5c2f0a7d2f40e5f8f2d18e34",
    "expiresInSeconds": 60
  }
}
```

### Validation
- user exists
- fingerprint is enabled for user
- challenge valid for 60s

---

## 6) API: Verify Fingerprint Capture

- **POST** `/api/auth/fingerprint/verify-capture`

### Purpose
Validate challenge + capture and create second-factor transaction.

### Request
```json
{
  "LoginName": "monty",
  "ClientCode": "LS000410",
  "ChallengeId": "chlg_5c2f0a7d2f40e5f8f2d18e34",
  "PidXml": "<PidData>...</PidData>",
  "DeviceInfoXml": "<DeviceInfo ... />"
}
```

### Success Response
```json
{
  "success": true,
  "message": "Fingerprint capture accepted. Continue with OTP/PIN.",
  "data": {
    "requiresSecondFactor": true,
    "transactionId": "txn_41f2d5a0229a5baf1be0d132"
  }
}
```

### Validation
- challenge exists, not expired, unused
- PID XML valid and `errCode = 0`
- if serial found, it must be in user allowed devices

---

## 7) API: Complete Login (PIN/OTP)

- **POST** `/api/auth/fingerprint/complete-login`

### Purpose
Final authentication step. Issues JWT and same auth payload style as current login.

### Request (PIN)
```json
{
  "LoginName": "monty",
  "TransactionId": "txn_41f2d5a0229a5baf1be0d132",
  "Pin": "4589"
}
```

### Request (OTP placeholder)
```json
{
  "LoginName": "monty",
  "TransactionId": "txn_41f2d5a0229a5baf1be0d132",
  "Otp": "123456"
}
```

### Success Response (example)
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "jwt-token",
  "isSubUser": true,
  "roleType": "User",
  "permissions": {},
  "allowedBranchIds": [1,2,3],
  "hasAllBranchAccess": false
}
```

### Validation
- transaction exists, not expired, not completed
- PIN hash match required (OTP provider not yet wired)

---

## 8) API: Set Fingerprint Status

- **POST** `/api/auth/fingerprint/set-status`

### Request
```json
{
  "LoginName": "monty",
  "ClientCode": "LS000410",
  "IsEnabled": true
}
```

### Response
```json
{
  "success": true,
  "message": "Fingerprint status updated.",
  "data": {
    "loginName": "monty",
    "isEnabled": true
  }
}
```

---

## 9) API: Get Fingerprint Status

- **GET** `/api/auth/fingerprint/status?LoginName=monty&ClientCode=LS000410`

### Response
```json
{
  "success": true,
  "data": {
    "loginName": "monty",
    "clientCode": "LS000410",
    "isEnabled": true,
    "preferredSecondFactor": "PIN",
    "hasPin": true,
    "devices": [
      {
        "deviceSerialNumber": "2536I005530",
        "friendlyDeviceName": "My Morpho Device",
        "deviceType": "MSO1300",
        "isAllowed": true,
        "lastUpdated": "2026-04-01T10:15:20Z"
      }
    ]
  }
}
```

---

## 10) Frontend Integration Steps (End-to-End)

## A. Registration screen
1. User signs in using existing secure method.
2. Open fingerprint settings.
3. Capture RD PID XML + DeviceInfo XML.
4. Call `POST /register` with PIN.
5. Store only API response status in frontend state.

## B. Login screen (fingerprint mode)
1. User enters LoginName and ClientCode.
2. Call `POST /challenge`.
3. Capture fingerprint from RD service.
4. Call `POST /verify-capture` with challenge + PID XML.
5. Show PIN input.
6. Call `POST /complete-login` with transactionId + PIN.
7. Save `token` and user permissions exactly as current auth flow.

## C. Fallback
- If fingerprint flow fails, keep button for normal `AuthLogin`.

---

## 11) Frontend Error Handling (recommended)

- `400`: validation/challenge/device errors -> show user message
- `401`: invalid PIN or inactive account -> show auth error
- `404`: user not found -> prompt to check LoginName/ClientCode
- `500`: generic failure -> retry + support message

---

## 12) Security Notes

- Keep HTTPS only.
- Never compare old/new PID XML for identity match.
- Do not issue JWT directly in `verify-capture`.
- Use challenge expiry and one-time challenge usage.
- Keep audit logs for register/verify/complete actions.

---

## 13) Postman Collection Order

1. `POST /api/auth/fingerprint/register`
2. `POST /api/auth/fingerprint/challenge`
3. `POST /api/auth/fingerprint/verify-capture`
4. `POST /api/auth/fingerprint/complete-login`
5. `GET /api/auth/fingerprint/status`
6. `POST /api/auth/fingerprint/set-status`

---

## 14) Backend Mapping (Project Structure)

- Controller: `GoldStringWebApp/Controllers/FingerprintController.cs`
- Service interface: `BusinessAccessLayer/IServices/IFingerprintAuthService.cs`
- Service impl: `BusinessAccessLayer/Service/FingerprintAuthService.cs`
- DTOs: `DataTransferObject/Models/ViewModel/FingerprintAuthModels.cs`
- Entities: `DataTransferObject/Models/tblUserFingerprintSettings.cs`, `tblFingerprintDevice.cs`, `tblFingerprintAuditLog.cs`, `tblAuthChallenge.cs`, `tblAuthTransaction.cs`
- DbContext: `DataAccessLayer/Data/GoldStringWebAppContext.cs`

