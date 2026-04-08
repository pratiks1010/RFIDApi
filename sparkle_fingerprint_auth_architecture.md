# Sparkle Authentication Architecture Document

## Objective
Build a secure login system for Sparkle that prevents "any captured fingerprint" from logging in as a user. The final solution should be production-grade, scalable, auditable, and suitable for ASP.NET Core backend + React frontend.

---

## Executive Summary

### What is wrong with the current approach
The current Morpho RD flow captures a fingerprint and returns PID XML. That XML proves a fingerprint was captured successfully, but it does **not** prove that it belongs to the exact registered user.

Because of that, this design is **not safe**:
- Register user by storing PID XML
- Login by capturing a new PID XML
- Compare old and new PID XML
- Or allow login only because `errCode = 0`

This is not a valid biometric identity check.

### Recommended final solution
Use **Passkey / WebAuthn** as the actual login system.

### Recommended immediate solution
Until passkeys are fully implemented, use:
- **Morpho fingerprint capture + PIN/OTP**
- Never fingerprint-only login in production

---

## Why current PID XML comparison is not valid

### RD device behavior
The local Morpho device with RD service:
- captures fingerprint
- returns encrypted PID XML
- includes success/failure, quality score, device info

But it does **not** give a reusable, stable biometric value that can be directly compared on the backend.

### What this means
You should **not** do:
- save registration PID XML
- capture login PID XML
- compare both values

The values change on every capture. Same finger does not produce the same PID payload.

### Current system risk
If backend logic is:
- parse PID XML
- check `errCode == 0`
- login success

then any valid captured finger can log in, not necessarily the registered user.

---

## Target Security Model

### Final architecture
Use **Passkey/WebAuthn** for login.

### Temporary architecture
Use **Morpho RD capture + PIN/OTP** until passkey migration is completed.

### Only if exact finger matching is legally or contractually required
Add a **biometric matcher engine / SDK**.

---

## Recommended Rollout Plan

### Phase 1: Immediate hardening
Goal: stop insecure fingerprint-only login.

#### Rules
- Disable fingerprint-only login in production
- Require PIN or OTP after successful Morpho capture
- Add challenge validation
- Add audit logs
- Add rate limiting and lockout

#### Result
Even if another person captures a finger, they still cannot log in without the user PIN/OTP.

---

### Phase 2: Introduce passkey registration
Goal: move to industry-standard account-bound authentication.

#### User journey
1. User signs in with existing secure method
2. User opens Security Settings
3. User clicks "Register Passkey"
4. Backend creates registration options/challenge
5. Frontend calls WebAuthn registration API
6. User approves via local biometric / Windows Hello / device PIN
7. Backend stores credential ID, public key, sign counter

---

### Phase 3: Passkey login becomes primary
Goal: real secure passwordless / biometric login.

#### User journey
1. User clicks "Sign in with Passkey"
2. Backend generates login challenge
3. Frontend calls WebAuthn authentication API
4. User unlocks with device fingerprint, face, or PIN
5. Backend verifies signature and challenge
6. Backend issues JWT / session

---

## How Morpho Device Should Be Used

### What Morpho can safely do
- local fingerprint capture
- attendance-like presence confirmation
- additional factor in shared desktop environments
- optional secondary branch security control

### What Morpho should not be used for alone
- sole proof of user identity based only on PID XML
- backend same-finger verification using stored PID XML

---

## Full Implementation Architecture

# 1. Temporary secure login flow (Morpho + PIN/OTP)

## 1.1 Registration Flow

### Frontend
1. User logs in with password/OTP/admin auth
2. User opens Fingerprint Settings page
3. Frontend checks RD service status
4. Frontend fetches device info
5. Frontend captures fingerprint from Morpho
6. Frontend sends registration payload to backend

### Backend Registration API
**POST** `/api/auth/fingerprint/register`

#### Request
```json
{
  "loginName": "Monty",
  "clientCode": "LS000410",
  "deviceName": "Morpho USB Device",
  "friendlyDeviceName": "My Morpho Fingerprint",
  "pidXml": "<PidData>...</PidData>",
  "deviceInfoXml": "<DeviceInfo>...</DeviceInfo>",
  "branchId": 1,
  "employeeId": 101
}
```

#### Backend validation
- user exists
- `pidXml` present
- XML parses correctly
- `errCode == 0`
- extract serial number, quality score, nmPoints, provider, device type
- log audit entry

#### Backend action
- save fingerprint-enabled record for user
- save device info record
- save audit log
- do **not** treat this as exact-finger proof

#### Response
```json
{
  "success": true,
  "message": "Fingerprint capture registered successfully.",
  "data": {
    "loginName": "Monty",
    "isEnabled": true,
    "deviceSerialNumber": "2536I005530",
    "qualityScore": 67,
    "nmPoints": 27
  }
}
```

---

## 1.2 Create Challenge Before Login

### API
**POST** `/api/auth/fingerprint/challenge`

#### Request
```json
{
  "loginName": "Monty",
  "clientCode": "LS000410"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "challengeId": "abc123xyz",
    "expiresInSeconds": 60
  }
}
```

### Backend action
- create one-time challenge
- set expiry 30-60 seconds
- mark unused

---

## 1.3 Verify Fingerprint Capture

### Frontend
1. User enters username
2. Frontend requests challenge
3. Frontend captures Morpho fingerprint
4. Frontend sends challenge + PID XML to backend

### API
**POST** `/api/auth/fingerprint/verify-capture`

#### Request
```json
{
  "loginName": "Monty",
  "clientCode": "LS000410",
  "challengeId": "abc123xyz",
  "pidXml": "<PidData>...</PidData>",
  "deviceInfoXml": "<DeviceInfo>...</DeviceInfo>"
}
```

#### Backend validation
- user exists
- fingerprint login enabled for user
- challenge exists and not expired
- challenge not already used
- PID XML parses
- `errCode == 0`
- optional device serial validation

#### Response on success
```json
{
  "success": true,
  "message": "Fingerprint capture accepted. Continue with OTP/PIN.",
  "data": {
    "requiresSecondFactor": true,
    "transactionId": "txn_001"
  }
}
```

### Important
This API must **not** directly issue JWT/session.

---

## 1.4 Complete Login With OTP/PIN

### API
**POST** `/api/auth/fingerprint/complete-login`

#### Request
```json
{
  "loginName": "Monty",
  "transactionId": "txn_001",
  "otp": "123456"
}
```

or

```json
{
  "loginName": "Monty",
  "transactionId": "txn_001",
  "pin": "4589"
}
```

#### Backend validation
- transaction valid
- not expired
- OTP or PIN valid
- issue JWT / auth session

#### Response
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "jwt-token-here",
  "user": {
    "loginName": "Monty"
  }
}
```

---

# 2. Final passkey authentication flow

## 2.1 Passkey Registration

### Step-by-step
1. User signs in with current secure method
2. User opens Security Settings
3. Frontend calls backend for registration options
4. Backend creates WebAuthn challenge/options
5. Frontend calls `navigator.credentials.create(...)`
6. User confirms using device biometric, Windows Hello, or PIN
7. Frontend sends attestation response to backend
8. Backend verifies response and stores credential record

### API 1
**POST** `/api/auth/passkey/register/options`

#### Request
```json
{
  "loginName": "Monty"
}
```

#### Response
Return WebAuthn registration options object.

### API 2
**POST** `/api/auth/passkey/register/verify`

#### Request
Frontend sends WebAuthn attestation result.

#### Backend stores
- CredentialId
- PublicKey
- SignCount
- UserId
- FriendlyName
- CreatedOn
- IsActive

---

## 2.2 Passkey Login

### Step-by-step
1. User clicks "Sign in with Passkey"
2. Backend creates assertion challenge/options
3. Frontend calls `navigator.credentials.get(...)`
4. User unlocks with local fingerprint / PIN / face
5. Frontend sends assertion to backend
6. Backend verifies signature, challenge, RP ID, origin, credential
7. Backend issues JWT / session

### API 1
**POST** `/api/auth/passkey/login/options`

#### Request
```json
{
  "loginName": "Monty"
}
```

#### Response
Return WebAuthn authentication options object.

### API 2
**POST** `/api/auth/passkey/login/verify`

#### Request
Frontend sends WebAuthn assertion result.

#### Backend verifies
- challenge
- origin
- RP ID
- credential ID exists for user
- signature valid
- sign counter valid

#### On success
Issue JWT / session.

---

## Database Design

### Table 1: UserFingerprintSettings
```sql
Id
UserId
LoginName
ClientCode
IsFingerprintEnabled
PreferredSecondFactor
CreatedOn
LastUpdated
StatusType
```

### Table 2: FingerprintDevices
```sql
Id
UserId
LoginName
DeviceSerialNumber
DeviceType
ProviderName
RdsId
RdsVersion
DpId
FriendlyDeviceName
IsAllowed
CreatedOn
LastUpdated
StatusType
```

### Table 3: FingerprintAuditLogs
```sql
Id
UserId
LoginName
ActionType
DeviceSerialNumber
QualityScore
NmPoints
ErrCode
ErrInfo
PidXml
DeviceInfoXml
IpAddress
MachineName
ClientCode
CreatedOn
```

### Table 4: AuthChallenges
```sql
Id
UserId
LoginName
ClientCode
ChallengeId
ChallengeType
ExpiresOn
IsUsed
CreatedOn
```

### Table 5: AuthTransactions
```sql
Id
UserId
LoginName
TransactionId
TransactionType
ExpiresOn
IsCompleted
CreatedOn
```

### Table 6: UserPasskeys
```sql
Id
UserId
LoginName
CredentialId
PublicKey
SignCount
FriendlyName
AaGuid
Transport
IsActive
CreatedOn
LastUsedOn
```

---

## DTO Models

### FingerprintRegisterRequest
```csharp
public class FingerprintRegisterRequest
{
    public string LoginName { get; set; }
    public string ClientCode { get; set; }
    public string DeviceName { get; set; }
    public string FriendlyDeviceName { get; set; }
    public string PidXml { get; set; }
    public string DeviceInfoXml { get; set; }
    public int? BranchId { get; set; }
    public int? EmployeeId { get; set; }
}
```

### FingerprintChallengeRequest
```csharp
public class FingerprintChallengeRequest
{
    public string LoginName { get; set; }
    public string ClientCode { get; set; }
}
```

### FingerprintVerifyCaptureRequest
```csharp
public class FingerprintVerifyCaptureRequest
{
    public string LoginName { get; set; }
    public string ClientCode { get; set; }
    public string ChallengeId { get; set; }
    public string PidXml { get; set; }
    public string DeviceInfoXml { get; set; }
}
```

### FingerprintCompleteLoginRequest
```csharp
public class FingerprintCompleteLoginRequest
{
    public string LoginName { get; set; }
    public string TransactionId { get; set; }
    public string Otp { get; set; }
    public string Pin { get; set; }
}
```

---

## XML Parsing Requirements

### Parse from PidXml
Extract:
- errCode
- errInfo
- qScore
- nmPoints
- device serial number
- device type
- provider IDs

### Parse from DeviceInfoXml
Extract:
- dpId
- rdsId
- rdsVer
- serial number
- device_type

### Important rule
Do not compare old PID XML with new PID XML.

---

## Backend Controller Design

### FingerprintController
```csharp
POST /api/auth/fingerprint/register
POST /api/auth/fingerprint/challenge
POST /api/auth/fingerprint/verify-capture
POST /api/auth/fingerprint/complete-login
POST /api/auth/fingerprint/set-status
GET  /api/auth/fingerprint/status
```

### PasskeyController
```csharp
POST /api/auth/passkey/register/options
POST /api/auth/passkey/register/verify
POST /api/auth/passkey/login/options
POST /api/auth/passkey/login/verify
POST /api/auth/passkey/remove
GET  /api/auth/passkey/list
```

---

## Frontend Screen Design

### Fingerprint Settings Page
Allow user to:
- check RD service
- get device info
- capture fingerprint
- enable/disable fingerprint mode
- register passkey
- view status

### Login Page
Temporary version:
- username input
- capture fingerprint button
- verify capture
- OTP/PIN input
- login button

Final version:
- sign in with passkey button
- fallback username + OTP/password

---

## Security Rules

### Required
- HTTPS only
- challenge expiry 30-60 seconds
- challenge one-time use only
- audit logging for every attempt
- account lockout after repeated failures
- OTP/PIN required until passkey is live
- passkey registration only after authenticated session

### Recommended
- device serial allow-list per user or per branch
- IP and machine logging
- admin alerts on repeated failures
- separate recovery flow if passkey device is lost

---

## What not to implement

Do not implement these incorrect patterns:

### Wrong Pattern 1
```text
Store registration PID XML
Capture login PID XML
Compare both PID XML values
```

### Wrong Pattern 2
```text
If errCode = 0 then login success
```

### Wrong Pattern 3
```text
Fingerprint-only login in production using RD capture only
```

---

## Exact Recommended Decision for Sparkle

### Right now
Implement:
- Morpho fingerprint capture
- challenge-based verification
- OTP/PIN mandatory
- audit logs
- no fingerprint-only login

### Next
Implement:
- WebAuthn/passkey registration
- WebAuthn/passkey login
- keep Morpho only as optional second factor if needed

### Only if mandatory
Add:
- biometric matcher engine

---

## Final conclusion

For Sparkle, the best production-grade standard is:

1. **Immediate secure flow:** Morpho fingerprint + OTP/PIN
2. **Final secure flow:** Passkey/WebAuthn login
3. **Do not use PID XML comparison for identity matching**

This gives:
- immediate risk reduction
- correct long-term security architecture
- compatibility with ASP.NET Core backend and React frontend
- industry-standard authentication design

