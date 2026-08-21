# VaultKey — Mobile Authenticator (Expo)

A Google-Authenticator-style TOTP app built with Expo. After pairing, it
generates valid 6-digit codes **fully offline** from secrets sealed in the
device keystore — exactly like the real thing, verified against official
RFC 6238 test vectors.

Part of a three-surface system:

```
totp-auth-app/
├── totp-authenticator-be/          ← NestJS API (this app calls it directly)
├── totp-authentication-nextjs-fe/  ← web dashboard (its QRs are what we scan)
└── totp-auth-mobile-main/          ← YOU ARE HERE (pnpm workspace + Expo app)
```

---

## Repository layout

This folder is a **pnpm workspace** (originally a Replit project). The actual
app lives in one workspace package:

```
totp-auth-mobile-main/
├── pnpm-workspace.yaml            # workspace + supply-chain guard (min release age)
├── package.json                   # root scripts (typecheck across packages)
├── artifacts/
│   └── authenticator-mobile/      # ★ THE EXPO APP — everything below is inside here
│       ├── app/                   # Expo Router screens
│       │   ├── _layout.tsx        # providers: fonts, keyboard, auth, error boundary
│       │   ├── index.tsx          # home: account cards, SVG ring, offline badge, FAB→scan
│       │   ├── scan.tsx           # camera QR pairing → "Connected" + live code
│       │   ├── add.tsx            # manual issuer/label creation (server mints secret)
│       │   ├── backup.tsx         # one-time backup codes + QR display
│       │   ├── settings.tsx       # biometric lock, sync, time-sync check, delete, logout
│       │   └── auth/login.tsx     # sign in / sign up toggle
│       ├── context/AuthContext.tsx# ★ session state, vault sync, QR pairing logic
│       ├── lib/
│       │   ├── api.ts             # fetch client: rotating refresh, offline-safe
│       │   ├── totp.ts            # ★ pure-JS RFC 6238 engine (no otplib!)
│       │   ├── vault.ts           # expo-secure-store wrapper (tokens + accounts)
│       │   └── types.ts
│       ├── components/            # ErrorBoundary, KeyboardAware compat, UI atoms
│       ├── scripts/test-totp.ts   # RFC 6238 vector suite (30 tests)
│       └── .env                   # EXPO_PUBLIC_API_URL
├── lib/                           # unused Replit scaffold packages (api clients, zod)
└── scripts/, server/              # Replit deploy helpers (not needed locally)
```

## Quick start

```bash
cd totp-auth-mobile-main
pnpm install
cd artifacts/authenticator-mobile

# point at your backend:
#   Android emulator -> http://10.0.2.2:<port>/api
#   physical phone   -> http://<YOUR-PC-LAN-IP>:<port>/api
# then:
pnpm exec expo start -c        # -c clears cache; required after any .env change
```

Scan the terminal QR with the **Expo Go** app (phone + PC on the same Wi-Fi;
allow Node through Windows Firewall for the API port).

---

## Core logic

### Pure-JS RFC 6238 engine (`lib/totp.ts`)
otplib depends on Node's `crypto` module, which **Metro cannot bundle** — the
app would not even build. So `lib/totp.ts` implements the standard from scratch,
synchronously and dependency-free:

```
base32_decode(secret)                       // RFC 4648
counter = floor(unix_time / period)         // T = floor(unixTime / 30)
digest   = HMAC-SHA1|SHA256|SHA512(key, counter_be_8bytes)
code     = dynamic_truncate(digest) % 10^digits
```

Validated by `scripts/test-totp.ts` against the official RFC 6238 vectors for
all three algorithms (`node --experimental-strip-types scripts/test-totp.ts`,
or `pnpm test:totp`) — 30/30 passing.

It also parses full `otpauth://` URIs (issuer, label, secret, algorithm, digits,
period) — nothing is hardcoded to 6 digits / 30 seconds.

### Secret handling (`lib/vault.ts`, `AuthContext.pairAccount`)
Secrets reach this device in exactly two ways:
1. **Creating an account** (`POST /accounts` sends only `{issuer, label}`) — the
   plaintext secret arrives once inside the response's `otpauthUri`; it's parsed
   and stored immediately.
2. **Scanning a QR** — the otpauth URI carries the secret itself. If exactly one
   server account matches issuer+label without a local secret, the scan **links**
   to that record (sync/delete keep working); otherwise it's stored as a
   `localOnly` device account.

Everything is persisted via **expo-secure-store** (hardware-backed keystore) —
never AsyncStorage. Sync merges the server list *without ever dropping*
device-local accounts, and deletion tolerates server 404s for them.

### Session resilience (`lib/api.ts`)
- Access token expired → single-flight refresh → retry once.
- Refresh failing due to **network** never signs you out ("You appear to be
  offline"); only a definitive 401/403 from `/auth/refresh` does.
- On definitive expiry, `setSessionExpiredHandler` (registered by AuthContext)
  wipes tokens + cached vault and routes back to login automatically.
- The backend allows multiple concurrent device sessions, so logging in on the
  web never invalidates this app.

### Extras
- Biometric lock (`expo-local-authentication`) gates the code list.
- Tap-to-copy with haptics; real SVG countdown ring; offline badge (NetInfo).
- Settings → **Check time sync**: verifies a locally generated code against
  `POST /verify` and warns about device clock drift instead of auto-correcting.
- Accounts without a cached secret show a "Scan pairing QR to activate" state
  rather than crashing.

---

## How this connects to the other folders

| Other surface | Connection |
|---|---|
| `totp-authenticator-be` | Direct HTTP via `EXPO_PUBLIC_API_URL`. Auth tokens live in SecureStore; every authed call attaches `Authorization: Bearer`. Verification, sync, delete all hit this API. |
| `totp-authentication-nextjs-fe` | The web dashboard's `/test` wizard mints an account and displays its QR — scanning that QR here imports the same secret, so both devices show identical rotating codes. Codes can also be proven by typing the phone's code into the web wizard's verify step. |

Pairing loop: web generates QR → this app scans → secret stored in keystore →
both sides derive codes from their own clocks → backend confirms they match.
