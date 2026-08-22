# VaultKey — Web Dashboard (Next.js)

Offline-first TOTP authenticator dashboard. Codes are generated **in the
browser** from an encrypted local vault — the server is only used for auth,
account metadata, verification, and the initial secret hand-off.

Part of a three-surface system:

```
totp-auth-app/
├── totp-authenticator-be/          ← NestJS API (this app proxies to it)
├── totp-authentication-nextjs-fe/  ← YOU ARE HERE (Next.js 16, App Router)
└── totp-auth-mobile-main/          ← Expo mobile authenticator (pairs via our QRs)
```

---

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:3000 (backend must be running, see .env.local)
```

`.env.local`:

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | NestJS API base (`http://localhost:4000/api`) |
| `AUTH_COOKIE_NAME` | httpOnly access-token cookie name (`at_token`; refresh lives in `rt_token`) |
| `NEXT_PUBLIC_GITHUB_URL` / `_LINKEDIN_URL` / `_TWITTER_URL` / `_PORTFOLIO_URL` | links rendered in navbar/footer/open-source section |

> `NEXT_PUBLIC_*` values are inlined at startup — restart the dev server after editing.

---

## Folder structure

```
app/
├── page.tsx                # landing page (Clears design system, session-aware navbar)
├── layout.tsx              # Inter + JetBrains Mono fonts, metadata
├── globals.css             # design tokens (@theme), .eyebrow/.dot-grid/.chrome-dots utilities
├── login/ signup/          # auth forms → proxy routes → httpOnly cookies
├── dashboard/              # server component: session check + account fetch → live cards
├── test/                   # guided pairing wizard: QR → backup codes → phone-code verify
├── settings/               # regenerate backup codes, delete accounts, logout
├── demo/ (+ success/)      # standalone end-to-end harness (separate from the product UI)
└── api/                    # ★ server-side proxies to the NestJS backend
    ├── auth/{signup,login,logout}/route.ts
    ├── accounts/route.ts, accounts/[id]/route.ts, accounts/[id]/code/route.ts
    ├── verify/route.ts
    └── demo/login/route.ts, demo/login/verify/route.ts

components/
├── site/SiteNavbar.tsx     # ◆ VaultKey logo → "/", session-aware Sign in / Go to Dashboard
├── site/SiteFooter.tsx     # social links from NEXT_PUBLIC_* env
├── DashboardClient.tsx     # vault hydration + account grid + brand bar
├── AccountCard.tsx         # derived-state timer: code recomputed per 30s window
├── CountdownRing.tsx       # SVG ring, violet→amber→red as the window drains

lib/
├── server/proxy.ts         # ★ cookie auth, auto-refresh-on-401, backend forwarding
└── client/
    ├── api.ts              # fetch wrapper; 401 → /login redirect
    ├── totp.ts             # otplib v13 generateSync + otpauth URI parser
    ├── vault.ts            # ★ IndexedDB + Web Crypto encrypted secret store
    ├── issuers.ts          # issuer icon/color mapping for cards
    └── types.ts
```

---

## Core logic

### Auth never touches client JS
1. Login/signup posts to **our own API route**, which forwards to the backend and
   sets `at_token` (15 min) + `rt_token` (7 d) as **httpOnly cookies**.
2. Every authed call goes through `proxyBackend()` (`lib/server/proxy.ts`),
   which attaches `Authorization: Bearer …` server-side.
3. On a backend 401, the proxy silently calls `/auth/refresh` with `rt_token`,
   retries once, and re-sets both cookies. Only a definitive refresh rejection
   reaches the browser, which then redirects to `/login`.
4. The backend treats the refresh hash as a revocation flag, so web + mobile
   sessions coexist without kicking each other out.

### Encrypted local vault (`lib/client/vault.ts`)
- A **non-extractable** AES-GCM `CryptoKey` is generated once and stored in
  IndexedDB — script can encrypt/decrypt but cannot export the key.
- When an account is created, the plaintext secret is parsed from the returned
  `otpauthUri`, encrypted, and stored as `{accountId, iv, ciphertext}`.
- Nothing plaintext ever lands in localStorage.

### Offline code generation (`AccountCard.tsx`)
Derived-state pattern — one clock tick drives everything, so the code can never
freeze while the timer moves:

```tsx
const [now, setNow] = useState(() => Date.now());
useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); ... }, []);

const counter = Math.floor(now / 30_000);
const remaining = 30 - (Math.floor(now / 1000) % 30);
const code = useMemo(() => secret ? generateCode(secret) : null, [secret, counter]);
```

- Secret present → pure local math (otplib v13 with relaxed guardrails so
  legacy 10-byte secrets still work).
- No cached secret → refetches `GET /api/accounts/:id/code` once per window
  (server fallback), and the card offers QR pairing.

### Pairing wizard (`/test`)
Generate QR → scan with the mobile app → save backup codes (once) → **type the
code shown on your phone** → verified via `POST /verify`. The wizard
deliberately does *not* display the live code — the only valid input comes from
the paired device.

---

## Design system

`design.md` (repo root) defines the "Clears" aesthetic applied site-wide:
near-black surfaces (`#0A0A0B/#141416`), hairline borders (`#2A2A2E`), a single
violet accent (`#8B5CF6`), Inter + JetBrains Mono, mono uppercase eyebrow tags,
node/dotted-connector motifs, window-chrome panels. Tokens live in
`globals.css` (`@theme inline`); shared navbar/footer in `components/site/`.

---

## How this connects to the other folders

| Other surface | Connection |
|---|---|
| `totp-authenticator-be` | All traffic flows through `app/api/*` → `lib/server/proxy.ts` → `BACKEND_URL`. The browser never talks to the API directly and never sees a JWT. |
| `totp-auth-mobile-main/artifacts/authenticator-mobile` | This app **mints** accounts and shows their QR; the mobile app scans that QR to receive the same secret. Both then independently generate identical codes; the backend arbitrates verification. |

Secret flow: `POST /accounts` response → parsed from `otpauthUri` → encrypted
into the browser vault → codes generated offline forever after.
