# VaultKey — Offline-First TOTP Authenticator

A complete 2FA authenticator platform: a **web dashboard**, a **mobile app**,
and a **hardened API** — all speaking the same RFC 6238 contract. Enroll once
by scanning a QR, and every surface derives the same rotating 6-digit codes
locally from the device clock. No network required after enrollment.

```
┌──────────────────────┐   proxied HTTP    ┌──────────────────────┐   direct HTTPS   ┌──────────────────────┐
│  WEB DASHBOARD       │ ────────────────► │  BACKEND API         │ ◄──────────────── │  MOBILE APP          │
│  Next.js 16          │  httpOnly cookies │  NestJS 10           │  Bearer (Secure  │  Expo SDK 54         │
│  Web Crypto vault    │ ◄──────────────── │  AES-256-GCM at rest │  Store)          │  pure-JS RFC 6238    │
└──────────┬───────────┘                   └──────────┬───────────┘                   └──────────┬───────────┘
           │                                          ▼                                          │
           │                                 ┌──────────────────┐                                │
           │        scan QR (otpauth:// ── secret, the only hand-off)                           │
           └────────────────────────────────► │ PostgreSQL/Prisma│ ◄─────────────────────────────┘
                    type phone's code back    └──────────────────┘        codes generated OFFLINE
                    into /test to prove it                               on both devices
```

---

## Repository layout

| Folder | What it is | Docs |
|---|---|---|
| [`totp-authenticator-be/`](./totp-authenticator-be/) | **NestJS API** — auth (JWT access + refresh), account enrollment with AES-256-GCM secrets at rest, TOTP verification with replay protection, single-use backup codes, per-account throttling, Prisma + PostgreSQL | [README](./totp-authenticator-be/README.md) |
| [`totp-authentication-nextjs-fe/`](./totp-authentication-nextjs-fe/) | **Web dashboard** — landing page, cookie-based auth via server proxy, encrypted browser vault (IndexedDB + non-extractable key), live code cards, guided mobile-pairing wizard, settings | [README](./totp-authentication-nextjs-fe/README.md) |
| [`totp-auth-mobile-main/`](./totp-auth-mobile-main/) | **Expo mobile app** (`artifacts/authenticator-mobile`) — camera QR pairing, SecureStore keystore vault, biometric lock, self-contained RFC 6238 engine validated against official test vectors | [README](./totp-auth-mobile-main/README.md) |
| [`design.md`](./design.md) | The "Clears" design system used across the web surfaces | |
| [`architecture.excalidraw`](./architecture.excalidraw) | Module/flow diagram (open at excalidraw.com or the VS Code extension); regenerate with `node generate-architecture.mjs` | |

---

## Quick start

### 1. Backend API (required first)

```bash
cd totp-authenticator-be
npm install
# fill .env — DATABASE_URL, ENCRYPTION_KEY, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, PORT=4000
npx prisma migrate dev
npm run start:dev          # binds 0.0.0.0 → http://localhost:4000/api
```

### 2. Web dashboard

```bash
cd totp-authentication-nextjs-fe
pnpm install
# .env.local → BACKEND_URL=http://localhost:4000/api
pnpm dev                   # http://localhost:3000
```

### 3. Mobile app (Expo Go)

```bash
cd totp-auth-mobile-main/artifacts/authenticator-mobile
pnpm install
# .env → EXPO_PUBLIC_API_URL=http://<YOUR-PC-LAN-IP>:4000/api
pnpm exec expo start -c    # scan terminal QR with Expo Go (same Wi-Fi)
```

> `-c` clears Metro's cache — required whenever `.env` changes, since
> `EXPO_PUBLIC_*` values are baked in at startup.

---

## The end-to-end loop

1. **Sign up / sign in** on the web dashboard.
2. Open **Test with mobile** (`/test`) → *Generate pairing QR*. The backend
   mints a unique 160-bit secret for your account and returns an `otpauth://`
   URI + QR + single-use backup codes.
3. In the mobile app tap **+**, scan the QR. The secret is parsed from the URI
   and sealed in the device keystore — the app shows **Connected**.
4. Save the backup codes (shown once), then **type the 6-digit code from your
   phone** into the wizard's verify step.
5. ✅ Verified — both devices now rotate identical codes every 30 seconds,
   fully offline.

The demo harness at `/demo` proves the same loop for any number of distinct
users, each with their own unique secret.

---

## Security model

- **Secrets encrypted at rest** — AES-256-GCM on the server; non-extractable
  Web Crypto key / hardware keystore on clients. Plaintext exists only inside
  the enrollment response and QR.
- **Offline-first generation** — TOTP = HMAC(secret, floor(unix_time / 30)).
  Clients compute it locally; the API is verification authority + fallback.
- **Replay protection** — an account's accepted time-step can only move
  forward (atomic conditional update); replays are rejected even when the code
  is mathematically valid.
- **Drift tolerance + throttling** — ±30 s window; verify endpoints limited to
  5 attempts/min *per account*.
- **Multi-device sessions** — refresh tokens rotate per device; the stored hash
  acts as a revocation flag so logging in on one device never signs out
  another. Logout revokes everything.
- **No JWT in JS** — the web stores tokens in httpOnly cookies and proxies all
  API traffic through Next.js server routes with automatic refresh.

---

## Tech stack

| Layer | Technologies |
|---|---|
| Web | Next.js 16 (App Router), React 19, Tailwind CSS v4, otplib v13, jsQR, Web Crypto |
| API | NestJS 10, TypeScript strict, Prisma ORM, PostgreSQL, @nestjs/jwt + passport, @nestjs/throttler, qrcode |
| Mobile | Expo SDK 54, Expo Router, expo-secure-store, expo-camera, expo-local-authentication, react-native-svg, custom RFC 6238 engine |

---

## Documentation index

- [Backend README](./totp-authenticator-be/README.md) — API reference, folder structure, verification internals
- [Web README](./totp-authentication-nextjs-fe/README.md) — proxy architecture, vault design, timer pattern, design system
- [Mobile README](./totp-auth-mobile-main/README.md) — workspace layout, RFC 6238 engine, pairing/linking rules, session resilience
- [design.md](./design.md) — colors, typography, components ("Clears" system)
- [architecture.excalidraw](./architecture.excalidraw) — visual module diagram
