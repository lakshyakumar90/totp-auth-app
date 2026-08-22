# Audit — TOTP Authenticator App

**Date:** 2026-08-21
**Scope:** `totp-authentication-nextjs-fe` (Next.js frontend) + `totp-authenticator-be` (NestJS backend)

---

## 1. Overview

An offline-first, two-factor authentication (2FA) authenticator application. Users sign up / log in, enroll a device by scanning a QR code with any standard authenticator app (Google Authenticator, Authy, etc.), and generate 30-second rotating 6-digit TOTP codes. Codes are generated **locally on the client** from an encrypted secret cached on-device, so they keep working without network access.

The product scope is intentionally minimal: a public landing page explaining the project, and a guided test flow (signup → QR enrollment → code verification → connected account). There is no support for connecting external third-party accounts by scanning arbitrary `otpauth://` URIs — that functionality was removed in this audit cycle.

---

## 2. Architecture & Flows

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Next.js FE (this   │  HTTP   │  NestJS BE               │
│  repo)              │ ──────► │  totp-authenticator-be   │
│                     │         │                          │
│  app/api/* routes   │         │  auth / accounts /       │
│  proxy to the BE    │ ◄────── │  totp / verify modules   │
│  via proxyBackend() │         │  Prisma → PostgreSQL     │
└─────────────────────┘         └──────────────────────────┘
```

### Enrollment flow (test wizard)
1. User signs up (`POST /api/auth/signup`) then logs in (`POST /api/auth/login`) — FE proxies both to the BE; a JWT session cookie is set.
2. FE creates a TOTP account for the user (`POST /api/accounts`). The BE mints a unique random base32 secret, stores it AES-256-GCM encrypted, and returns an `otpauth://` URI + QR data URL + single-use backup codes.
3. FE parses the URI, encrypts the secret client-side, and caches it in the local vault (`lib/client/vault.ts`) so codes can be generated offline.
4. User scans the QR with their authenticator app and clicks **"I scanned it"**.
5. User submits the 6-digit code from their app; FE requests a login token (`POST /api/demo/login`) and verifies the code (`POST /api/demo/login/verify`).
6. On success the user lands on the success page showing their connected account and live rotating code.

### Code generation
- **Primary path (offline):** secret is decrypted from the local vault; code generated in-browser with otplib's functional API (`generateSync({ secret })`).
- **Fallback path (server):** `GET /api/accounts/[id]/code` asks the BE to decrypt and generate.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| OTP | `otplib` v13 (functional API: `generateSync`, `verifySync`, `generateSecret`, `generateURI`) |
| Hashing | bcrypt (cost 12) for backup codes & passwords |
| Encryption | AES-256-GCM for TOTP secrets at rest |
| Auth | JWT access + refresh tokens in httpOnly cookies |

> Note: otplib v13 removed the old `authenticator` singleton. All usage was migrated to the functional exports during this audit.

---

## 4. Folder Structure

### Frontend (`totp-authentication-nextjs-fe/`)

```
app/
├── page.tsx                  # Landing page (public)
├── layout.tsx                # Root layout
├── globals.css
├── dashboard/page.tsx        # Main account list (auth required)
├── login/page.tsx            # Login form
├── signup/page.tsx           # Signup form
├── settings/page.tsx         # Account mgmt: delete, regenerate backup codes, logout
├── test/page.tsx             # Guided mobile-pairing test wizard
├── demo/
│   ├── page.tsx              # Full demo flow: signup → QR → verify
│   └── success/page.tsx      # Post-verification success screen
└── api/                      # Server-side proxies to the NestJS BE
    ├── auth/{signup,login,logout}/route.ts
    ├── accounts/route.ts
    ├── accounts/[id]/route.ts
    ├── accounts/[id]/code/route.ts
    ├── demo/login/route.ts
    ├── demo/login/verify/route.ts
    └── verify/route.ts

components/
├── DashboardClient.tsx       # Account grid + online/offline badge
├── AccountCard.tsx           # Per-account card w/ live code + countdown ring
├── CountdownRing.tsx         # SVG ring showing time until code rollover
├── useOnline.ts              # navigator.onLine hook

lib/
├── client/
│   ├── api.ts                # http helper (fetch wrapper over /api/*)
│   ├── totp.ts               # parseOtpauthUri, generateCode, codeExpiresIn
│   ├── vault.ts              # client-side encrypted secret cache
│   ├── issuers.ts            # issuer metadata
│   └── types.ts              # shared client types
└── server/
    └── proxy.ts              # proxyBackend() — forwards FE api routes to BE
```

### Backend (`totp-authenticator-be/src/`)

```
main.ts, app.module.ts
auth/
├── auth.controller.ts        # signup, login, refresh, logout
├── auth.service.ts
├── dto/auth.dto.ts
├── guards/                   # JWT guard, optional-JWT guard
└── strategies/               # passport-jwt access & refresh strategies
accounts/
├── accounts.controller.ts    # create/list/delete accounts, get code
├── accounts.service.ts       # secret minting, backup-code generation
└── dto/create-account.dto.ts
totp/totp.service.ts          # otplib wrappers: secret gen, otpauth URI, checkCode
verify/
├── verify.controller.ts      # TOTP + backup-code verification endpoints
├── verify.service.ts         # window tolerance, replay protection, audit log
├── demo/                     # demo login-token issue + verify
├── dto/verify.dto.ts
└── guards/account-throttler.guard.ts
common/crypto.service.ts      # AES-256-GCM encrypt/decrypt, sha256
prisma/prisma.service.ts      # Prisma client lifecycle
prisma/migrations/            # DB migrations
```

---

## 5. Feature Inventory

### Current features
| Feature | Location | Status |
|---|---|---|
| Public landing page | `app/page.tsx` | Present (Next.js starter template — see recommendations) |
| Email/password signup & login | `app/signup`, `app/login`, BE `auth` module | Working |
| JWT session cookies (access + refresh) | BE `auth/strategies`, FE `app/api/auth/*` | Working |
| Account creation w/ unique per-user secret | BE `accounts.service.createAccount` | Working |
| QR enrollment (otpauth URI + data-url QR) | BE `totp.service`, shown in `/test`, `/demo` | Working |
| Offline local code generation | `lib/client/totp.ts` + `vault.ts` | Working |
| Live countdown ring per code | `components/CountdownRing.tsx` | Working |
| Online/offline indicator | `components/useOnline.ts` | Working |
| TOTP verification w/ replay protection | BE `verify.service.verifyAccount` | Working |
| Single-use bcrypt-hashed backup codes | BE `accounts.service.generateBackupCodes` | Working |
| Backup-code regeneration | `app/settings` (delete+recreate) | Working |
| Account deletion | `app/settings`, BE `DELETE /accounts/:id` | Working |
| Guided test wizard (scan → "I scanned it" → verify) | `app/test`, `app/demo` | Working |
| Verification attempt audit log | BE `verify.service.logAttempt` → `VerificationLog` | Working |

### Removed in this audit (2026-08-21)
| Feature | Reason |
|---|---|
| `app/add-account/page.tsx` — manual entry + camera scan of arbitrary `otpauth://` URIs to connect third-party services | Out of scope; product is self-contained (own enrollment only) |
| `components/QrScanner.tsx` — getUserMedia-based QR scanner | Only consumer was add-account |
| "+ Add account" button on dashboard | Pointed to removed page; empty-state CTA repointed to `/test` |

---

## 6. Security Review

### Strengths
- **Secrets encrypted at rest** — AES-256-GCM with auth tag (`iv:tag:ciphertext`), key derived via SHA-256 from `ENCRYPTION_KEY` env var. Decryption failures throw rather than leak.
- **Backup codes never stored in plaintext** — bcrypt cost 12; single-use enforced atomically via conditional `updateMany` (`usedAt: null` guard) preventing double-spend races.
- **TOTP replay protection** — accepted time-step stored per account (`lastAcceptedStep`); verification requires strictly newer step, atomically via conditional update.
- **Verification throttling** — `account-throttler.guard.ts` guards verify endpoints.
- **Audit logging** — every verification attempt (success/failure, kind, step) recorded best-effort without breaking request paths.
- **Ownership checks** — all account operations scoped by `userId`; ownership violations return 404/403.
- **Client-side vault** — secrets cached encrypted on-device; plaintext secret only ever held in memory transiently.
- **Server-side proxying** — browser never talks to the BE directly; cookies handled server-side in `app/api/*` routes.

### Weaknesses / risks
1. **Encryption key derivation** — `sha256(ENCRYPTION_KEY)` is acceptable but a proper KDF (HKDF/scrypt) would be more principled. Key rotation is not supported; rotating `ENCRYPTION_KEY` invalidates all stored secrets.
2. **Client-side secret exposure** — the sync endpoint returns encrypted secrets to the client; security of offline codes depends entirely on the strength of the client-side vault implementation and the user's device.
3. **No rate limiting on auth endpoints** — signup/login rely only on Nest default throttling (if any); credential stuffing is possible. Recommend explicit rate limits + lockout.
4. **Backup-code lookup is O(n) bcrypt compares** — fine at 10 codes, but each failed verify costs up to 10 × ~250ms; a per-account throttle exists but should be verified under load.
5. **`verificationLog.userId` fallback `'anonymous'`** — string sentinel instead of nullable FK; slightly pollutes data integrity.
6. **Demo endpoints** — `/demo/login` issues login tokens from email+password outside the main auth flow; ensure these are disabled or clearly rate-limited in production.

---

## 7. Known Gaps & Recommendations

1. **Landing page** still shows the default Next.js starter template — replace with real product content (what/how/architecture/folder structure).
2. **Regenerate backup codes** implemented as DELETE + POST account recreation (new secret). A dedicated BE endpoint would avoid forcing re-enrollment just to rotate codes.
3. **No tests** in either repo. Priority: unit tests for `verify.service` (replay, tolerance windows) and `crypto.service` round-trip; e2e for the enrollment→verify flow.
4. **Error handling** — FE surfaces raw error messages from the proxy; consider mapping to friendly copy.
5. **Accessibility** — dashboard/settings use `confirm()` dialogs; replace with accessible modal components.
6. **CI** — no lint/typecheck pipeline configured; add GitHub Actions running `tsc --noEmit` + `next lint` (FE) and `tsc --noEmit` + eslint (BE).

---

## 8. Verification Status

- Frontend `tsc --noEmit`: **passing** after removals (no dangling imports of `QrScanner` or `/add-account`).
- Backend `tsc --noEmit`: passing as of the transaction-timeout fix (bcrypt hashing moved out of the Prisma interactive transaction in `generateBackupCodes`).
