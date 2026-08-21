# TOTP Authenticator — Backend API

NestJS service that owns every secret in the VaultKey system. Users register,
enroll TOTP accounts, verify codes, and manage single-use backup codes. This is
the **source of truth**: both the web dashboard and the mobile app talk to it.

Part of a three-surface system:

```
totp-auth-app/
├── totp-authenticator-be/          ← YOU ARE HERE (NestJS API, port 4000)
├── totp-authentication-nextjs-fe/  ← Next.js web dashboard (proxies to this)
└── totp-auth-mobile-main/          ← Expo mobile authenticator (calls this directly)
```

---

## Quick start

```bash
npm install
# fill .env (see below), then:
npx prisma migrate dev      # create/sync the database
npm run start:dev           # http://localhost:<PORT>/api
```

Required env (`.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ENCRYPTION_KEY` | hex string → SHA-256 → AES-256-GCM key for secrets at rest |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | token signing |
| `PORT` | default `3000` — this deployment uses **4000** |
| `TOTP_WINDOW` | drift tolerance in steps (default 1 → ±30s) |

> The server binds explicitly to `0.0.0.0` so phones on the LAN can reach it.

---

## Folder structure

```
src/
├── main.ts                     # bootstrap: BigInt JSON safety net, 0.0.0.0 bind, /api prefix
├── app.module.ts               # ConfigModule + ThrottlerModule + feature modules
├── auth/                       # signup / login / refresh / logout
│   ├── auth.controller.ts
│   ├── auth.service.ts         # token issuing, multi-device refresh, revocation flag
│   ├── dto/auth.dto.ts
│   ├── guards/                 # JwtAuthGuard, OptionalJwtAuthGuard
│   └── strategies/             # passport-jwt access & refresh strategies
├── accounts/                   # CRUD + sync + server-side code generation
│   ├── accounts.controller.ts
│   ├── accounts.service.ts     # secret minting, backup codes, ownership checks
│   └── dto/create-account.dto.ts
├── totp/totp.service.ts        # ★ core crypto wrapper (otplib v13 functional API)
├── verify/
│   ├── verify.controller.ts    # POST /verify, POST /verify/backup
│   ├── verify.service.ts       # replay protection, attempt audit log
│   ├── demo/                   # two-step relying-party login (loginToken flow)
│   ├── guards/account-throttler.guard.ts
│   └── dto/verify.dto.ts
├── common/crypto.service.ts    # AES-256-GCM encrypt/decrypt, sha256
├── prisma/                     # PrismaService (global)
prisma/schema.prisma            # User, TotpAccount, BackupCode, VerificationLog
```

---

## Core logic

### Secret lifecycle
1. `POST /accounts` mints a **160-bit** random secret (`generateSecret({ length: 20 })`),
   stores it AES-256-GCM encrypted (`iv:tag:ciphertext`), and returns an
   `otpauth://` URI + QR data-URL + 10 single-use backup codes **once**.
2. Clients parse the secret out of the URI and cache it locally (browser
   IndexedDB vault / phone keystore). The plaintext never leaves the enrollment
   response.
3. Codes are then generated **client-side**; this API is only a fallback
   (`GET /accounts/:id/code`) and the verification authority.

> **Compatibility note:** otplib v13 rejects secrets < 16 bytes by default.
> Accounts created under the previous version have 10-byte secrets, so
> `totp.service.ts` passes `createGuardrails({ MIN_SECRET_BYTES: 8 })` to every
> generate/verify call. New secrets are 20 bytes.

### Verification (`verify.service.ts`)
```
checkCode(secret, code)            → delta via otplib verifySync (±TOTP_WINDOW steps)
matchedStep = currentStep + delta
UPDATE totp_accounts SET last_accepted_step = matchedStep
WHERE id = ? AND last_accepted_step < matchedStep   -- atomic replay guard
```
- A code whose time-step is not **strictly newer** than the last accepted one is
  rejected with `reason: "replay"` — even if mathematically valid.
- Every attempt is logged to `verification_logs` (best-effort, never throws).
- `/verify` and `/verify/backup` are throttled to **5 attempts/min per account**
  (keyed on accountId, not IP).

### Multi-device sessions (`auth.service.ts`)
`refresh_tokens.refresh_token_hash` is a **revocation flag**, not a
single-session lock:

- `login` issues a fresh pair and stores the new hash (overwriting is fine).
- `refresh` validates **signature + expiry + hash-is-present** — it does *not*
  compare hashes. This lets web + phone (+ N devices) hold valid sessions
  simultaneously without kicking each other out.
- `logout` nulls the hash → all refresh tokens for that user are revoked.

### Response safety
`main.ts` installs `BigInt.prototype.toJSON` and verification responses serialize
`step` as a string — Prisma `BigInt` fields would otherwise crash
`JSON.stringify` with a 500 *after* the work succeeded.

---

## API surface (prefix `/api`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/signup` | – | `{email, password}` → `{id, email}` (no tokens) |
| POST | `/auth/login` | – | → `{accessToken, refreshToken, accessTokenExpiresIn}` |
| POST | `/auth/refresh` | – | rotating pair; multi-device safe |
| POST | `/auth/logout` | Bearer | revokes stored refresh hash |
| GET | `/accounts` | Bearer | `[{id, issuer, label}]` — never secrets |
| POST | `/accounts` | Bearer | `{issuer, label}` → `{id, otpauthUri, qrCode, backupCodes}` |
| GET | `/accounts/:id/code` | Bearer | server-generated `{code, expiresInSeconds}` fallback |
| DELETE | `/accounts/:id` | Bearer | ownership-checked |
| GET | `/accounts/sync` | Bearer | metadata + **server-encrypted** secrets (clients cannot decrypt) |
| POST | `/verify` | optional | `{accountId, code}` or stateless `{secret, code}` |
| POST | `/verify/backup` | Bearer | consumes a single-use backup code |
| POST | `/demo/login` | – | `{email,password}` → `{accountId, loginToken}` (2 min TTL) |
| POST | `/demo/login/verify` | – | `{loginToken, accountId, code}` → session or `{reason}` |

Validation: email format · password 8–128 · issuer ≤128 · label ≤256 ·
code exactly `\d{6}` · backup code `[A-Za-z0-9_-]+`.

---

## How this connects to the other folders

| Consumer | Base URL config | Relationship |
|---|---|---|
| `totp-authentication-nextjs-fe` | `BACKEND_URL` in its `.env.local` | Browser **never** calls this API directly — Next.js API routes proxy with the httpOnly cookie attached and auto-refresh on 401 |
| `totp-auth-mobile-main/artifacts/authenticator-mobile` | `EXPO_PUBLIC_API_URL` in its `.env` | Calls this API directly over LAN/internet; stores tokens in expo-secure-store; receives secrets by scanning the QR that `POST /accounts` produces |

Secret distribution model: the **only** moment a client holds a plaintext
secret is (a) the `POST /accounts` response or (b) scanning the QR derived from
it. Everything afterwards is offline math on the client, verified here.
