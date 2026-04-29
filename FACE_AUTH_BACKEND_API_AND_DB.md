# Face Auth Backend API and DB Guide

This document is the backend reference for strict 1:1 face authentication in this project.

## Scope

- Face status API
- Face register API
- Face login API
- RFID EPC to RFID code API (dashboard helper)
- SQL table creation scripts for current and recommended security extensions

## Current Behavior Summary

- Register is token-bound and prevents normal overwrite.
- Login validates descriptor/image and matches against enrolled face.
- Lockout exists for repeated failed attempts.
- Responses include structured fields like `Success`, `Matched`, `ReasonCode`, and (for login) similarity metrics.

## Reason Codes

- `INVALID_REQUEST`
- `USER_NOT_FOUND`
- `UNAUTHORIZED`
- `IDENTITY_MISMATCH`
- `FACE_ALREADY_REGISTERED`
- `INVALID_DESCRIPTOR`
- `INVALID_IMAGE`
- `FACE_NOT_REGISTERED`
- `RATE_LIMITED`
- `INVALID_STORED_DESCRIPTOR`
- `LIVENESS_FAILED`
- `FACE_NOT_MATCHED`
- `ACCOUNT_INACTIVE`
- `FACE_LOGIN_SUCCESS`
- `FACE_REGISTERED`
- `FACE_REGISTERED_SUCCESS`

---

## 1) Face Status

### Endpoint

- `GET /api/auth/face/status?LoginName={loginName}&ClientCode={clientCode}`

### Success

```json
{
  "Success": true,
  "IsRegistered": true,
  "ReasonCode": "FACE_REGISTERED",
  "Message": "Face is registered for this account."
}
```

### Error

```json
{
  "Message": "No account found for the provided LoginName and ClientCode.",
  "Code": "USER_NOT_FOUND"
}
```

---

## 2) Face Register

### Endpoint

- `POST /api/auth/face/register`
- Auth required: `Bearer JWT`

### Request

```json
{
  "LoginName": "Monty",
  "ClientCode": "LS000410",
  "Descriptor": [0.12, -0.08, "... total 128 values ..."],
  "ImageBase64": "data:image/jpeg;base64,...",
  "DeviceId": "webcam-01",
  "LivenessPassed": true
}
```

### Success

```json
{
  "Success": true,
  "Matched": true,
  "ReasonCode": "FACE_REGISTERED_SUCCESS",
  "Message": "Face registered successfully.",
  "LoginName": "Monty",
  "ClientCode": "LS000410"
}
```

### Conflict (already enrolled)

```json
{
  "Success": false,
  "Matched": false,
  "ReasonCode": "FACE_ALREADY_REGISTERED",
  "Message": "Face is already registered for this account. Use secure re-enroll flow to change face data.",
  "Code": "FACE_ALREADY_REGISTERED"
}
```

---

## 3) Face Login

### Endpoint

- `POST /api/auth/face/login`

### Request

```json
{
  "LoginName": "Monty",
  "ClientCode": "LS000410",
  "Descriptor": [0.13, -0.09, "... total 128 values ..."],
  "ImageBase64": "data:image/jpeg;base64,...",
  "DeviceId": "webcam-01",
  "LivenessPassed": true
}
```

### Success

```json
{
  "Success": true,
  "Matched": true,
  "Distance": 0.8421,
  "ThresholdUsed": 0.8,
  "LivenessPassed": true,
  "ReasonCode": "FACE_LOGIN_SUCCESS",
  "Token": "<jwt-token>",
  "Message": "Face login successful."
}
```

### Face mismatch

```json
{
  "Success": false,
  "Matched": false,
  "Distance": 0.62,
  "ThresholdUsed": 0.8,
  "LivenessPassed": true,
  "ReasonCode": "FACE_NOT_MATCHED",
  "Message": "Face verification failed. The captured face does not match this account.",
  "Code": "FACE_NOT_MATCHED"
}
```

### Liveness failed

```json
{
  "Success": false,
  "Matched": false,
  "LivenessPassed": false,
  "ReasonCode": "LIVENESS_FAILED",
  "Message": "Liveness verification failed. Please try again with a live face capture.",
  "Code": "LIVENESS_FAILED"
}
```

### Rate limited

```json
{
  "Success": false,
  "Matched": false,
  "LivenessPassed": true,
  "ReasonCode": "RATE_LIMITED",
  "RetryAfterSeconds": 300,
  "Message": "Too many failed face login attempts. Try again after 5 minutes.",
  "Code": "RATE_LIMITED"
}
```

---

## 4) RFID Dashboard EPC to RFID Codes

### Endpoint

- `POST /api/RFIDDashboard/GetRFIDCodesByEPCValues`

### Request

```json
{
  "ClientCode": "LS000410",
  "EPCValues": [
    "E280117000000208A1B2C3D4",
    " E280117000000208A1B2C3D5 ",
    "e280117000000208a1b2c3d6"
  ]
}
```

### Response

```json
{
  "RequestedCount": 3,
  "MatchedCount": 2,
  "NotFoundCount": 1,
  "NotFoundEPCValues": [
    "e280117000000208a1b2c3d6"
  ],
  "Items": [
    {
      "EPCValue": "E280117000000208A1B2C3D4",
      "RFIDCode": "RFID-000124"
    },
    {
      "EPCValue": "E280117000000208A1B2C3D5",
      "RFIDCode": "RFID-000125"
    }
  ]
}
```

---

## SQL: Table Creation Scripts

## A) Current face profile table (used now)

```sql
IF OBJECT_ID(N'dbo.tblUserFaceAuth', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblUserFaceAuth
    (
        Id                  INT IDENTITY(1,1) PRIMARY KEY,
        CreatedOn           DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        LastUpdated         DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
        StatusType          BIT NOT NULL DEFAULT 1,
        UserId              NVARCHAR(450) NOT NULL,
        LoginName           NVARCHAR(256) NULL,
        ClientCode          NVARCHAR(50) NOT NULL,
        DescriptorJson      NVARCHAR(MAX) NULL,
        ImageBase64         NVARCHAR(MAX) NULL,
        LastSimilarityScore FLOAT NOT NULL DEFAULT 0,
        FailedAttempts      INT NOT NULL DEFAULT 0,
        LastFailedOn        DATETIME2(7) NULL,
        LastLoginOn         DATETIME2(7) NULL,
        LastIpAddress       NVARCHAR(128) NULL,
        LastMachineName     NVARCHAR(512) NULL,
        IsEnabled           BIT NOT NULL DEFAULT 1
    );

    CREATE NONCLUSTERED INDEX IX_tblUserFaceAuth_UserId
        ON dbo.tblUserFaceAuth(UserId);

    CREATE NONCLUSTERED INDEX IX_tblUserFaceAuth_LoginName_ClientCode
        ON dbo.tblUserFaceAuth(LoginName, ClientCode);
END
GO
```

## B) Recommended audit table

```sql
IF OBJECT_ID(N'dbo.tblFaceAuthAuditLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblFaceAuthAuditLog
    (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId          NVARCHAR(450) NULL,
        LoginName       NVARCHAR(256) NULL,
        ClientCode      NVARCHAR(50) NULL,
        ActionType      NVARCHAR(50) NOT NULL,
        ReasonCode      NVARCHAR(80) NULL,
        Success         BIT NOT NULL,
        Matched         BIT NULL,
        Distance        FLOAT NULL,
        ThresholdUsed   FLOAT NULL,
        LivenessPassed  BIT NULL,
        DeviceId        NVARCHAR(128) NULL,
        IpAddress       NVARCHAR(128) NULL,
        MachineName     NVARCHAR(512) NULL,
        CreatedOn       DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_tblFaceAuthAuditLog_UserClientCreated
        ON dbo.tblFaceAuthAuditLog(UserId, ClientCode, CreatedOn DESC);
END
GO
```

## C) Recommended anti-replay challenge table

```sql
IF OBJECT_ID(N'dbo.tblFaceAuthChallenge', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblFaceAuthChallenge
    (
        Id           BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId       NVARCHAR(450) NOT NULL,
        ClientCode   NVARCHAR(50) NOT NULL,
        ChallengeId  NVARCHAR(100) NOT NULL,
        Nonce        NVARCHAR(200) NOT NULL,
        ExpiresOn    DATETIME2(7) NOT NULL,
        IsUsed       BIT NOT NULL DEFAULT 0,
        CreatedOn    DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE NONCLUSTERED INDEX UX_tblFaceAuthChallenge_ChallengeId
        ON dbo.tblFaceAuthChallenge(ChallengeId);
END
GO
```

## D) One-time cleanup (keep one active face profile per user)

```sql
;WITH cte AS (
    SELECT
        Id,
        UserId,
        ROW_NUMBER() OVER (PARTITION BY UserId ORDER BY LastUpdated DESC, Id DESC) AS rn
    FROM dbo.tblUserFaceAuth
    WHERE StatusType = 1
)
UPDATE f
SET
    f.IsEnabled = CASE WHEN cte.rn = 1 THEN 1 ELSE 0 END,
    f.StatusType = CASE WHEN cte.rn = 1 THEN 1 ELSE 0 END
FROM dbo.tblUserFaceAuth f
JOIN cte ON cte.Id = f.Id;
GO
```

---

## Configuration

Add threshold in `appsettings.json`:

```json
{
  "FaceAuth": {
    "SimilarityThreshold": 0.8
  }
}
```

Tune this with real usage (FAR/FRR) before production rollout.
