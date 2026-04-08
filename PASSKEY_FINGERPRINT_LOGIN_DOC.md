# Passkey (Fingerprint) Login - Complete Implementation Guide

This document explains the full design and usage of the new fingerprint login implementation based on **Passkeys/WebAuthn**.

---

## 1) Why this architecture

Your old idea (`PidXml` store and compare) is not reliable for identity authentication because:

- `PidXml` is encrypted/session-specific data and changes every scan.
- RD success only proves "some finger was captured", not "same registered person".
- It does not provide origin-bound cryptographic proof.

This implementation uses **WebAuthn/Passkeys**:

- Device creates private/public key pair.
- Private key never leaves device.
- User unlocks private key using fingerprint/face/PIN on local device.
- Server verifies challenge signature with stored public key.

This is industry-standard and phishing resistant.

---

## 2) Files added/updated

- `GoldStringWebApp/Controllers/PasskeyAuthController.cs`
- `DataTransferObject/Models/tblPasskeyCredential.cs`
- `DataTransferObject/Models/tblPasskeyChallenge.cs`
- `DataAccessLayer/Data/GoldStringWebAppContext.cs`
- `GoldStringWebApp/Program.cs`
- `GoldStringWebApp/appsettings.json`
- `GoldStringWebApp/GoldStringWebApp.csproj`

---

## 3) Runtime architecture

### Components

- **Frontend**: Browser WebAuthn API (`navigator.credentials.create/get`).
- **Backend API**: `PasskeyAuthController`.
- **Database**: `GoldStringDb` tables:
  - `tblPasskeyCredential` (registered passkeys per user)
  - `tblPasskeyChallenge` (short-lived challenge/options)
- **Identity**: Existing `AspNetUsers` / `ApplicationUser`.
- **JWT**: Existing token generation (`JwtService`) reused.

### High-level flow

1. User requests registration options.
2. Backend returns WebAuthn registration options + stores challenge.
3. Browser creates passkey (fingerprint prompt appears on device).
4. Backend verifies attestation and stores public key.
5. For login, backend returns assertion options + stores challenge.
6. Browser signs challenge using passkey (fingerprint prompt).
7. Backend verifies assertion and returns same token payload shape as `AuthLogin`.

---

## 4) Database design

## `tblPasskeyCredential`

Stores each registered passkey credential for one ASP.NET Identity user.

Important columns:

- `AspNetUserId` -> FK reference target to `AspNetUsers.Id` (string id).
- `CredentialId` -> base64url credential identifier (unique per credential).
- `PublicKey` -> COSE public key bytes used for assertion verification.
- `SignatureCounter` -> anti-cloning counter from authenticator.
- `UserHandle` -> optional user handle returned by authenticator.
- `IsActive` -> soft disable support.
- `CreatedOnUtc`, `LastUsedOnUtc` -> audit fields.

## `tblPasskeyChallenge`

Stores short-lived challenge/options JSON for one user and flow type.

Important columns:

- `AspNetUserId`
- `FlowType` (`registration` or `login`)
- `OptionsJson` (serialized WebAuthn options)
- `ExpiresOnUtc`

### Suggested SQL table creation (manual script)

```sql
USE [GoldStringDb];
GO

IF OBJECT_ID('dbo.tblPasskeyCredential', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblPasskeyCredential (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AspNetUserId NVARCHAR(450) NOT NULL,
        CredentialId NVARCHAR(512) NOT NULL,
        PublicKey VARBINARY(MAX) NOT NULL,
        SignatureCounter BIGINT NOT NULL DEFAULT(0),
        UserHandle NVARCHAR(200) NULL,
        FriendlyName NVARCHAR(250) NULL,
        CreatedOnUtc DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME()),
        LastUsedOnUtc DATETIME2 NULL,
        IsActive BIT NOT NULL DEFAULT(1)
    );

    CREATE UNIQUE INDEX UX_tblPasskeyCredential_CredentialId
        ON dbo.tblPasskeyCredential (CredentialId);

    CREATE INDEX IX_tblPasskeyCredential_AspNetUserId_IsActive
        ON dbo.tblPasskeyCredential (AspNetUserId, IsActive);
END
GO

IF OBJECT_ID('dbo.tblPasskeyChallenge', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tblPasskeyChallenge (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AspNetUserId NVARCHAR(450) NOT NULL,
        FlowType NVARCHAR(20) NOT NULL,
        OptionsJson NVARCHAR(MAX) NOT NULL,
        ExpiresOnUtc DATETIME2 NOT NULL,
        CreatedOnUtc DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
    );

    CREATE INDEX IX_tblPasskeyChallenge_User_Flow_Expiry
        ON dbo.tblPasskeyChallenge (AspNetUserId, FlowType, ExpiresOnUtc);
END
GO
```

> Note: Current code already supports EF model, but if migration generation is skipped in your environment, execute above SQL directly.

---

## 5) Config required

In `appsettings.json`:

```json
"WebAuthn": {
  "ServerDomain": "rfidapi.loyalstring.in",
  "ServerName": "GoldString RFID",
  "Origins": [
    "https://frontend-test.loyalstring.in",
    "https://sparkleerp.loyalstring.in",
    "http://localhost:3000"
  ]
}
```

Rules:

- `ServerDomain` must match RP domain policy.
- All frontend hosts used for passkey must be present in `Origins`.
- For production, use only HTTPS origins.

---

## 6) API contract (request/response)

Base route: `api/PasskeyAuth`

## A) Begin passkey registration

`POST /api/PasskeyAuth/register/options`

Request:

```json
{
  "LoginName": "admin",
  "DisplayName": "Admin User"
}
```

Response:

- HTTP 200 with WebAuthn `CredentialCreateOptions` JSON.
- Frontend sends this to `navigator.credentials.create(...)`.

Common errors:

- `404 User not found.`

---

## B) Complete passkey registration

`POST /api/PasskeyAuth/register/complete`

Request:

```json
{
  "LoginName": "admin",
  "FriendlyName": "Office Laptop Fingerprint",
  "AttestationResponse": {
    "id": "....",
    "rawId": "....",
    "type": "public-key",
    "response": {
      "clientDataJSON": "....",
      "attestationObject": "...."
    }
  }
}
```

Response:

```json
{
  "Message": "Passkey registration successful."
}
```

Common errors:

- `400 Registration challenge expired or missing.`
- `400 Invalid registration options.`

---

## C) Begin passkey login

`POST /api/PasskeyAuth/login/options`

Request:

```json
{
  "LoginName": "admin"
}
```

Response:

- HTTP 200 with WebAuthn `AssertionOptions` JSON.
- Frontend sends this to `navigator.credentials.get(...)`.

Common errors:

- `401 Invalid credentials`
- `400 No passkey registered for this user.`

---

## D) Complete fingerprint login (main login endpoint)

`POST /api/PasskeyAuth/AuthLoginFingerprint`

Request:

```json
{
  "LoginName": "admin",
  "AssertionResponse": {
    "id": "....",
    "rawId": "....",
    "type": "public-key",
    "response": {
      "authenticatorData": "....",
      "clientDataJSON": "....",
      "signature": "....",
      "userHandle": "...."
    }
  }
}
```

Response (same pattern as existing `AuthLogin`):

For sub-user:

```json
{
  "Token": "jwt-token",
  "IsSubUser": true,
  "RoleType": "User",
  "Permissions": { },
  "AllowedBranchIds": [1,2],
  "HasAllBranchAccess": false
}
```

For super admin:

```json
{
  "Token": "jwt-token",
  "IsSubUser": false,
  "RoleType": "SuperAdmin",
  "Permissions": { },
  "AllowedBranchIds": null,
  "HasAllBranchAccess": true
}
```

Common errors:

- `401 Login challenge expired or missing.`
- `401 Invalid login challenge.`
- `401 Unknown passkey.`
- `401 Account is inactive.`

---

## 7) Frontend integration steps

1. Call `/register/options`.
2. Convert base64url fields if your helper requires conversion.
3. Call `navigator.credentials.create({ publicKey: options })`.
4. Send credential to `/register/complete`.

For login:

1. Call `/login/options`.
2. Call `navigator.credentials.get({ publicKey: options })`.
3. Send assertion to `/AuthLoginFingerprint`.
4. Save returned JWT exactly as current `AuthLogin` flow.

---

## 8) Security model and best practices

- Challenge expiry is short (5 min currently).
- Challenge is deleted/rotated by user + flow.
- Signature counter updated to detect cloned authenticators.
- User verification is required (`UserVerificationRequirement.Required`).
- JWT generation path is unchanged to keep authorization stable.
- Never store raw biometric templates in your DB.

---

## 9) Important operational notes

- This flow supports **platform biometric** (fingerprint/face/PIN) through passkey.
- If your USB RD device is mandatory, treat it as secondary/presence check, not identity root.
- Keep `WebAuthn.Origins` synchronized with all deployed frontend domains.
- Use HTTPS in production for WebAuthn.

---

## 10) Suggested rollout plan

1. Keep current `AuthLogin` (username/password) active.
2. Add passkey registration screen under user profile/security settings.
3. Enable `AuthLoginFingerprint` as optional login method.
4. After adoption, optionally enforce passkey for high-privilege users.
5. Add admin UI to revoke user passkeys (`IsActive = 0`).

---

## 11) Testing checklist

- Register passkey for existing user.
- Login with passkey and verify JWT works on protected endpoints.
- Try login after challenge expiry -> must fail.
- Try with unknown credential -> must fail.
- Disable passkey row (`IsActive = 0`) -> login must fail.
- Verify sub-user and super-admin response payloads remain unchanged in structure.

