# Authentication Playbook

This playbook guides the implementation of backend authentication systems derived from frontend UI flows and requirements.

---

## 1. What to Infer From Frontend

Identify these UI elements to determine the scope of the Auth system:

- **Login / Register Pages**: Basic entry points for identity management.
- **Forgot / Reset Password Flows**: Implies token generation and transactional email.
- **User Profile / Settings**: Requires fetching and updating personal data.
- **Protected Routes**: Any page redirecting to Login implies JWT/session guard.
- **Role-based UI**: Admin dashboards, restricted buttons imply RBAC requirements.
- **Social Login Buttons** (Google, GitHub, Apple): Implies OAuth2 provider integration.
- **"Verify your email" banner**: Implies email verification flow with resend capability.
- **Two-Factor Authentication settings**: Implies TOTP (Google Authenticator) or SMS-based 2FA.
- **"Active Sessions" page**: Implies multi-device session management.

---

## 2. Required Backend Entities

```
User
  - id
  - email (unique, indexed)
  - password_hash (nullable — null for OAuth-only users)
  - name
  - avatar_url
  - role: user | admin | owner
  - is_verified: boolean (default false)
  - totp_secret (nullable — set when 2FA enabled)
  - totp_enabled: boolean
  - created_at, updated_at

RefreshToken
  - id
  - user_id → User
  - token_hash (hashed — never store plaintext)
  - device_info (user-agent, IP)
  - expires_at
  - is_revoked: boolean
  - created_at

PasswordResetToken
  - id
  - user_id → User
  - token_hash
  - expires_at
  - used_at (nullable)

EmailVerificationToken
  - id
  - user_id → User
  - token_hash
  - expires_at

OAuthAccount (for social login)
  - id
  - user_id → User
  - provider: google | github | apple
  - provider_user_id (unique per provider)
  - access_token (encrypted at rest)
  - refresh_token (encrypted at rest)
  - token_expires_at
```

---

## 3. Required API Endpoints

### Identity & Access

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /auth/register | ❌ | Create account, send verification email |
| POST | /auth/login | ❌ | Verify credentials, issue tokens |
| POST | /auth/refresh | ❌ | Issue new access token from refresh token |
| POST | /auth/logout | ✅ | Revoke current refresh token |
| POST | /auth/logout-all | ✅ | Revoke all refresh tokens (all devices) |

### Email Verification

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /auth/verify-email | ❌ | Consume token, mark `is_verified = true` |
| POST | /auth/resend-verification | ✅ | Resend verification email |

### Password Recovery

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /auth/forgot-password | ❌ | Send reset email with token |
| POST | /auth/reset-password | ❌ | Consume token, set new password |
| POST | /auth/change-password | ✅ | Change password (requires current password) |

### OAuth2 / Social Login

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /auth/oauth/:provider | ❌ | Redirect to provider consent screen |
| GET | /auth/oauth/:provider/callback | ❌ | Handle provider callback, issue tokens |
| POST | /auth/oauth/:provider/disconnect | ✅ | Unlink social account |

### Two-Factor Authentication (2FA)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /auth/2fa/enable | ✅ | Generate TOTP secret + QR code |
| POST | /auth/2fa/verify | ✅ | Confirm TOTP code to activate 2FA |
| POST | /auth/2fa/disable | ✅ | Disable 2FA (requires valid TOTP code) |
| POST | /auth/2fa/challenge | ❌ | Verify TOTP during login (step-up auth) |

### Session Management

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | /users/me | ✅ | Current user profile |
| PATCH | /users/me | ✅ | Update profile |
| GET | /auth/sessions | ✅ | List active sessions |
| DELETE | /auth/sessions/:id | ✅ | Revoke a specific session |

---

## 4. Authentication Flows

### Standard Login Flow

```
1. POST /auth/login { email, password }
2. Find user by email → verify password hash
3. If 2FA enabled → return { requiresTwoFactor: true, tempToken }
   Else → issue accessToken + refreshToken
4. Store hashed refreshToken in DB with device info
5. Return tokens (accessToken in body, refreshToken in HttpOnly Cookie)
```

### OAuth2 Flow (Authorization Code)

```
1. GET /auth/oauth/google → redirect to Google consent
2. User grants access → Google redirects to /auth/oauth/google/callback?code=...
3. Exchange code for tokens with provider
4. Fetch user info from provider (email, name, avatar)
5. Find existing OAuthAccount by (provider + provider_user_id)
   - Found → load linked User, issue app tokens
   - Not found + email exists → link to existing User, create OAuthAccount
   - Not found → create User + OAuthAccount, issue app tokens
6. Return app tokens
```

### Two-Factor Challenge Flow

```
1. Login with correct credentials → returns { requiresTwoFactor: true, tempToken }
2. POST /auth/2fa/challenge { tempToken, totpCode }
3. Verify TOTP code against user's totp_secret
4. Issue full accessToken + refreshToken
```

### Refresh Token Rotation

```
Each /auth/refresh call:
1. Validate refresh token (exists, not expired, not revoked)
2. Revoke the OLD refresh token immediately
3. Issue NEW refresh token + new access token
4. Return both tokens
```

This prevents refresh token replay attacks.

---

## 5. Security Rules

- **Password hashing**: Argon2id with recommended work factors. Never MD5/SHA1/BCrypt < cost 12.
- **Token storage**: Access token in memory (not localStorage). Refresh token in HttpOnly, Secure, SameSite=Strict cookie.
- **Refresh token rotation**: Rotate on every use (see flow above).
- **Single-use tokens**: Password reset and email verification tokens must be invalidated immediately after use.
- **Token expiry**: Access token ≤ 15 min. Refresh token ≤ 7 days.
- **Rate limiting**: Login and forgot-password endpoints — 10 req / 15 min per IP.
- **TOTP secrets**: Store encrypted at rest. Never expose in API responses.
- **OAuth tokens**: Encrypt provider access/refresh tokens at rest.
- **Email enumeration**: Return identical responses for "user not found" and "wrong password" on login.
- **Logout-all**: Provide this for security incident response.

---

## 6. Background Jobs

- `send-verification-email` — after registration
- `send-password-reset-email` — after forgot-password request
- `cleanup-expired-tokens` — nightly cron (remove expired reset + verification tokens)

---

## 7. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=<min 32 char random string>
JWT_REFRESH_SECRET=<min 32 char random string>
JWT_EXPIRES_IN=900           # 15 minutes in seconds
JWT_REFRESH_EXPIRES_IN=604800 # 7 days in seconds

# OAuth2 Providers
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# OAuth callback base URL
OAUTH_CALLBACK_URL=https://api.yourapp.com/auth/oauth

# Email
EMAIL_PROVIDER_API_KEY=your_key
EMAIL_FROM=no-reply@yourapp.com
FRONTEND_URL=https://yourapp.com

# Encryption (for OAuth tokens at rest)
ENCRYPTION_KEY=<32 byte hex string>

# 2FA
TOTP_ISSUER=YourAppName
```

---

## 8. File Structure

```
src/
  auth/
    auth.controller.ts
    auth.service.ts
    auth.module.ts
    dto/
      login.dto.ts
      register.dto.ts
      reset-password.dto.ts
    strategies/
      jwt.strategy.ts
      google.strategy.ts
      github.strategy.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    helpers/
      token.helper.ts       ← hash, sign, verify
      totp.helper.ts        ← TOTP secret + QR gen
      encryption.helper.ts  ← encrypt/decrypt oauth tokens
    entities/
      refresh-token.entity.ts
      password-reset-token.entity.ts
      email-verification-token.entity.ts
      oauth-account.entity.ts
    workers/
      auth-email.worker.ts
```
