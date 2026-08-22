import Link from "next/link";
import SiteNavbar from "@/components/site/SiteNavbar";
import SiteFooter from "@/components/site/SiteFooter";
import { hasSession } from "@/lib/server/proxy";

const GITHUB = process.env.NEXT_PUBLIC_GITHUB_URL;

function SectionHeading({
  tag,
  title,
  sub,
}: {
  tag: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="eyebrow">{tag}</span>
      <h2 className="mt-5 text-3xl sm:text-4xl font-medium tracking-tight text-[#f5f5f7]">
        {title}
      </h2>
      {sub ? (
        <p className="mt-4 text-[15px] leading-7 text-[#a1a1aa]">{sub}</p>
      ) : null}
    </div>
  );
}

export default async function Home() {
  const authed = await hasSession();

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f5f5f7]">
      <SiteNavbar />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-40 pb-32">
        <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,black,transparent)]" />
        <div className="relative mx-auto max-w-[1200px] px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow">rfc 6238 · offline-first 2fa</span>
            <h1 className="mt-7 text-5xl sm:text-6xl font-medium tracking-tight leading-[1.08] text-[#f5f5f7]">
              Your 2FA codes,
              <br />
              <span className="text-[#8b5cf6]">generated on your device.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#a1a1aa]">
              VaultKey is an authenticator that works like the engineering tool
              it is — secrets encrypted at rest, codes derived locally from
              pure math, zero network required after enrollment.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/test"
                className="inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition"
              >
                <span>◆</span> Run the 2FA test
              </Link>
              <Link
                href={authed ? "/dashboard" : "/login"}
                className="inline-flex items-center rounded-md border border-[#2a2a2e] px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] text-[#a1a1aa] hover:text-[#f5f5f7] hover:border-[#52525b] transition"
              >
                {authed ? "Go to Dashboard" : "Sign in"}
              </Link>
            </div>
          </div>

          {/* Mock UI panel with node connectors */}
          <div className="relative mx-auto mt-20 max-w-md">
            {/* connector nodes */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-2 h-2 bg-[#8b5cf6] rotate-45" />
              <div className="h-10 border-l border-dashed border-[#2a2a2e]" />
            </div>
            <div className="absolute top-1/2 -left-14 hidden sm:flex flex-col items-center">
              <div className="w-2 h-2 border border-[#2a2a2e]" />
              <div className="w-10 border-t border-dashed border-[#2a2a2e]" />
            </div>
            <div className="absolute top-1/2 -right-14 hidden sm:flex flex-col items-center">
              <div className="w-2 h-2 border border-[#2a2a2e]" />
              <div className="w-10 border-t border-dashed border-[#2a2a2e]" />
            </div>

            <div className="rounded-xl border border-[#2a2a2e] bg-[#141416] shadow-2xl shadow-black/60">
              <div className="chrome-dots flex items-center gap-1.5 px-4 py-3 border-b border-[#2a2a2e]">
                <span />
                <span />
                <span />
                <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b70]">
                  vaultkey · live
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#f5f5f7]">
                      Mobile Link
                    </p>
                    <p className="mt-0.5 text-xs text-[#6b6b70]">my phone</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                      synced
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <p className="font-mono text-4xl tracking-[0.18em] text-[#f5f5f7] select-none">
                    ••• •••
                  </p>
                  <svg width="46" height="46" viewBox="0 0 46 46" className="-rotate-90">
                    <circle cx="23" cy="23" r="19" fill="none" stroke="#26262a" strokeWidth="4" />
                    <circle
                      cx="23" cy="23" r="19" fill="none" stroke="#8b5cf6" strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 19}`}
                      strokeDashoffset={`${2 * Math.PI * 19 * 0.62}`}
                    />
                  </svg>
                </div>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b70]">
                  tap to copy · rotates every 30s · works offline
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" className="border-t border-[#2a2a2e] py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <SectionHeading
            tag="how it works"
            title="Enroll once. Rotate forever."
            sub="Three steps between you and an authenticator that never needs your secrets sent anywhere again."
          />
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                t: "Create your account",
                d: "Email and password. The API mints a unique 160-bit TOTP secret scoped to your user — AES-256-GCM encrypted at rest, never returned in plaintext lists.",
              },
              {
                n: "02",
                t: "Scan the pairing QR",
                d: "The web shows an otpauth:// QR encoding your secret. The mobile app scans it, parses issuer, label and parameters, and seals the secret in the device keystore.",
              },
              {
                n: "03",
                t: "Codes rotate everywhere",
                d: "Phone and browser derive the same 6-digit code every 30 seconds from the device clock. Airplane mode, dead Wi-Fi, VPN — irrelevant.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="relative rounded-xl border border-[#2a2a2e] bg-[#141416] p-7"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 flex items-center justify-center bg-[#1a1a1d] border border-[#2a2a2e] font-mono text-[11px] text-[#8b5cf6]">
                    {s.n}
                  </span>
                  <div className="flex-1 border-t border-dashed border-[#2a2a2e]" />
                  <span className="w-1.5 h-1.5 bg-[#8b5cf6] rotate-45" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#f5f5f7]">
                  {s.t}
                </h3>
                <p className="mt-2.5 text-sm leading-6 text-[#a1a1aa]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CORE LOGIC ───────────────────────────────────────────────── */}
      <section id="logic" className="border-t border-[#2a2a2e] py-32">
        <div className="mx-auto max-w-[1200px] px-6 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <SectionHeading
              tag="core logic"
              title="An HMAC, a clock, and nothing else."
              sub="TOTP is not magic — it's a shared secret and synchronized time. VaultKey refuses to hide that behind hand-waving:"
            />
            <ul className="mt-8 space-y-4">
              {[
                ["counter", "= floor(unix_time / 30) — both sides count identical 30-second windows"],
                ["digest", "= HMAC-SHA1(secret, counter) — the only cryptographic operation"],
                ["code", "= dynamic_truncate(digest) mod 10⁶ — six digits, deterministic, offline"],
              ].map(([k, v]) => (
                <li key={k} className="flex gap-3 text-sm leading-6">
                  <span className="font-mono text-[#8b5cf6] shrink-0">◆</span>
                  <span className="text-[#a1a1aa]">
                    <code className="font-mono text-[#f5f5f7]">{k}</code>{" "}
                    {v}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-10 grid sm:grid-cols-3 gap-4">
              {[
                ["offline-first", "secrets cached encrypted on-device; generation is local math"],
                ["aes-256-gcm", "secrets encrypted at rest on server and client vaults"],
                ["replay guard", "per-account time-step lockout + ±30s drift tolerance"],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg border border-[#2a2a2e] bg-[#141416] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8b5cf6]">
                    {t}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#a1a1aa]">{d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal panel */}
          <div className="rounded-xl border border-[#2a2a2e] bg-[#141416] overflow-hidden">
            <div className="chrome-dots flex items-center gap-1.5 px-4 py-3 border-b border-[#2a2a2e]">
              <span /><span /><span />
              <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b6b70]">
                totp.derivation
              </span>
            </div>
            <pre className="p-6 font-mono text-[13px] leading-7 overflow-x-auto">
              <code>
                <span className="text-[#6b6b70]">$</span>{" "}
                <span className="text-[#a1a1aa]">counter</span>{" "}
                <span className="text-[#8b5cf6]">=</span>{" "}
                <span className="text-zinc-300">floor(unix_time / 30)</span>
                {"\n"}
                <span className="text-[#6b6b70]">$</span>{" "}
                <span className="text-[#a1a1aa]">digest</span>{" "}
                <span className="text-[#8b5cf6]">=</span>{" "}
                <span className="text-zinc-300">HMAC-SHA1(secret, counter)</span>
                {"\n"}
                <span className="text-[#6b6b70]">$</span>{" "}
                <span className="text-[#a1a1aa]">code</span>{" "}
                <span className="text-[#8b5cf6]">=</span>{" "}
                <span className="text-zinc-300">truncate(digest) % 10⁶</span>
                {"\n\n"}
                <span className="text-emerald-400">✓ 396379</span>
                <span className="text-[#6b6b70]">
                  {" "}· valid on phone, web &amp; server{"\n"}
                </span>
                <span className="text-[#6b6b70]">
                  · next rotation in 12s — no network involved
                </span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ───────────────────────────────────────────────── */}
      <section id="stack" className="border-t border-[#2a2a2e] py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <SectionHeading
            tag="tech stack"
            title="Three clients. One contract."
            sub="Every surface speaks the same RFC 6238 math against the same hardened API."
          />
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              {
                tag: "web",
                t: "Next.js dashboard",
                items: ["Next.js 16 · App Router", "React 19 · Tailwind v4", "httpOnly JWT cookies", "Web Crypto vault (IndexedDB)", "otplib v13 · jsQR pairing"],
              },
              {
                tag: "api",
                t: "NestJS backend",
                items: ["NestJS 10 · TypeScript strict", "PostgreSQL · Prisma ORM", "JWT access + rotating refresh", "AES-256-GCM secrets at rest", "per-account verify throttling"],
              },
              {
                tag: "mobile",
                t: "Expo authenticator",
                items: ["Expo SDK 54 · Expo Router", "expo-secure-store keystore", "expo-camera QR pairing", "biometric app lock", "self-contained RFC 6238 engine"],
              },
            ].map((c) => (
              <div key={c.tag} className="rounded-xl border border-[#2a2a2e] bg-[#141416] p-7">
                <span className="inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-[#8b5cf6] border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 rounded-full px-3 py-1">
                  {c.tag}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[#f5f5f7]">{c.t}</h3>
                <ul className="mt-4 space-y-2.5">
                  {c.items.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#a1a1aa]">
                      <span className="mt-[7px] w-1 h-1 bg-[#8b5cf6] rotate-45 shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPEN SOURCE / GITHUB ─────────────────────────────────────── */}
      <section id="github" className="border-t border-[#2a2a2e] py-32 relative">
        <div className="absolute inset-x-0 bottom-0 h-40 dot-grid opacity-30 [mask-image:linear-gradient(to_top,black,transparent)]" />
        <div className="relative mx-auto max-w-[1200px] px-6">
          <SectionHeading
            tag="open source"
            title="How it's built."
            sub="One repository, three deployable surfaces, a single source of truth for the TOTP contract."
          />

          <div className="mt-14 grid lg:grid-cols-3 gap-6 font-mono text-sm">
            {[
              {
                p: "totp-authenticator-be/",
                d: "NestJS API — auth, accounts, verification with replay protection, demo relying-party login, Prisma migrations.",
              },
              {
                p: "totp-authentication-nextjs-fe/",
                d: "Next.js web — server-side cookie proxy, encrypted browser vault, live code dashboard, guided pairing wizard.",
              },
              {
                p: "totp-auth-mobile-main/",
                d: "Expo app — SecureStore vault, camera scanner, biometric lock, RFC 6238 engine validated against official test vectors.",
              },
            ].map((r) => (
              <div key={r.p} className="rounded-xl border border-[#2a2a2e] bg-[#141416] p-6">
                <p className="text-[#8b5cf6]">{r.p}</p>
                <p className="mt-3 font-sans text-sm leading-6 text-[#a1a1aa]">{r.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xl border border-[#2a2a2e] bg-[#141416] p-8">
            <div>
              <p className="text-lg font-medium text-[#f5f5f7]">
                Read the full implementation.
              </p>
              <p className="mt-1 text-sm text-[#a1a1aa]">
                Setup guides, API reference and the security model live in the
                repo READMEs.
              </p>
            </div>
            {GITHUB ? (
              <a
                href={GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition"
              >
                <span>◆</span> View on GitHub
              </a>
            ) : (
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6b70]">
                set NEXT_PUBLIC_GITHUB_URL to enable
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-[#2a2a2e] py-32">
        <div className="mx-auto max-w-[1200px] px-6 text-center">
          <span className="eyebrow">ready?</span>
          <h2 className="mt-6 text-3xl sm:text-4xl font-medium tracking-tight text-[#f5f5f7]">
            Prove the loop in under a minute.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-[#a1a1aa]">
            Generate a QR, scan it with the mobile app, type back the code you
            see. If it verifies, the whole stack works.
          </p>
          <Link
            href="/test"
            className="mt-9 inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition"
          >
            <span>◆</span> Run the 2FA test
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}