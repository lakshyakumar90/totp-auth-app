// Generates architecture.excalidraw — VaultKey module diagram
import { writeFileSync } from "node:fs";

let els = [];
let idc = 0;
const nid = () => `el-${++idc}`;
const sd = () => Math.floor(Math.random() * 2 ** 31);

function base(type, x, y, w, h, extra = {}) {
  return {
    id: nid(), type, x, y, width: w, height: h, angle: 0,
    strokeColor: "#1e1e1e", backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 1, strokeStyle: "solid",
    roughness: 1, opacity: 100, groupIds: [], frameId: null,
    roundness: type === "arrow" ? null : { type: 3 },
    seed: sd(), version: 1, versionNonce: sd(),
    isDeleted: false, boundElements: null, updated: 1700000000000,
    link: null, locked: false, ...extra,
  };
}

// rectangle with centered bound text
function rect(x, y, w, h, label, opts = {}) {
  const { bg = "#f4f4f5", stroke = "#1e1e1e", fontSize = 13, color = "#1e1e1e", strokeStyle = "solid" } = opts;
  const r = base("rectangle", x, y, w, h, { backgroundColor: bg, strokeColor: stroke, strokeStyle });
  const lines = label.split("\n");
  const th = lines.length * fontSize * 1.25;
  const t = base("text", x + 10, y + h / 2 - th / 2, w - 20, th, {
    text: label, fontSize, fontFamily: 2, textAlign: "center", verticalAlign: "middle",
    strokeColor: color, containerId: r.id, originalText: label, lineHeight: 1.25,
  });
  r.boundElements = [{ id: t.id, type: "text" }];
  els.push(r, t);
  return r;
}

// free-floating text
function txt(x, y, text, opts = {}) {
  const { size = 14, color = "#1e1e1e", font = 2 } = opts;
  const lines = text.split("\n");
  const t = base("text", x, y, 10, 10, {
    text, fontSize: size, fontFamily: font, textAlign: "left",
    strokeColor: color, lineHeight: 1.25,
  });
  t.height = lines.length * size * 1.25;
  t.width = Math.max(...lines.map((l) => l.length)) * size * 0.62;
  els.push(t);
  return t;
}

// arrow (supports elbows via multiple points)
function arrow(points, opts = {}) {
  const { color = "#1e1e1e", dashed = false, label: lbl = "", labelAt } = opts;
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  const rel = points.map(([px, py]) => [px - x, py - y]);
  const a = base("arrow", x, y, Math.max(...xs) - x, Math.max(...ys) - y, {
    points: rel, strokeColor: color, strokeStyle: dashed ? "dashed" : "solid",
    strokeWidth: 2, startBinding: null, endBinding: null, lastCommittedPoint: rel[rel.length - 1],
  });
  els.push(a);
  if (lbl) {
    const anchor = labelAt ?? { x: (xs[0] + xs[xs.length - 1]) / 2, y: (ys[0] + ys[ys.length - 1]) / 2 };
    txt(anchor.x - (lbl.length * 12 * 0.62) / 2, anchor.y - 22, lbl, { size: 12, color });
  }
  return a;
}

const VIOLET = "#8b5cf6";

// ── title ──────────────────────────────────────────────────────────
txt(60, 36, "VaultKey — system architecture & module flows", { size: 26 });
txt(60, 76, "three surfaces · one TOTP contract (RFC 6238)", { size: 14, color: "#6b6b70", font: 3 });

// ── WEB container ──────────────────────────────────────────────────
txt(80, 116, "WEB DASHBOARD — Next.js 16 (totp-authentication-nextjs-fe)", { size: 15, color: VIOLET });
els.push(base("rectangle", 80, 140, 430, 452, { backgroundColor: "#ffffff", strokeColor: "#2a2a2e" }));
rect(100, 158, 390, 52, "pages: landing · login/signup · dashboard\n/test pairing wizard · settings", { bg: "#f5f3ff" });
rect(100, 220, 390, 52, "app/api/* — server-side routes\n(httpOnly cookies, never exposes JWT to JS)");
rect(100, 282, 390, 52, "lib/server/proxy.ts — attach Bearer token\nauto-refresh once on 401, re-set cookies");
rect(100, 344, 390, 52, "browser vault — IndexedDB + NON-EXTRACTABLE\nAES-GCM key (Web Crypto)");
rect(100, 406, 390, 52, "AccountCard — otplib v13 generateSync()\ncode recomputed every 30s window · works OFFLINE");
rect(100, 468, 390, 52, "/test wizard — shows QR + backup codes,\nHIDES live code, verifies phone's 6-digit code");

// ── BACKEND container ──────────────────────────────────────────────
txt(620, 116, "BACKEND API — NestJS 10 (totp-authenticator-be) · :4000/api", { size: 15, color: VIOLET });
els.push(base("rectangle", 620, 140, 470, 452, { backgroundColor: "#ffffff", strokeColor: "#2a2a2e" }));
rect(640, 158, 430, 52, "/auth/* — JWT access (15m) + refresh (7d)\nmulti-device sessions · logout = revocation flag");
rect(640, 220, 430, 52, "POST /accounts — mint 160-bit secret\nAES-256-GCM encrypted at rest · returns otpauth:// + QR");
rect(640, 282, 430, 52, "GET /accounts/:id/code — server-generated code\n(fallback when client has no cached secret)");
rect(640, 344, 430, 52, "POST /verify — replay guard (last_accepted_step)\n±30s drift tolerance · 5 attempts/min per account");
rect(640, 406, 430, 52, "backup codes — bcrypt-hashed, single-use,\natomic claim · demo/login two-step flow");
rect(640, 468, 430, 52, "otplib v13 functional API\nrelaxed guardrails (legacy 10-byte secrets still verify)");

// ── MOBILE container ───────────────────────────────────────────────
txt(1180, 116, "MOBILE APP — Expo SDK 54 (authenticator-mobile)", { size: 15, color: VIOLET });
els.push(base("rectangle", 1180, 140, 400, 452, { backgroundColor: "#ffffff", strokeColor: "#2a2a2e" }));
rect(1200, 158, 360, 52, "home cards — SVG countdown ring\ntap-to-copy · offline badge · biometric lock");
rect(1200, 220, 360, 52, "lib/totp.ts — PURE-JS RFC 6238 engine\n(no otplib — Metro can't bundle node crypto)\nvalidated vs official RFC vectors");
rect(1200, 296, 360, 52, "SecureStore vault — tokens + secrets\nin hardware-backed keystore");
rect(1200, 358, 360, 52, "camera scanner — parses full otpauth:// URI\nlinks to matching account or stores device-local");
rect(1200, 420, 360, 52, "AuthContext — pairing (idempotent), dedupe sync,\nresilient refresh (network blips never sign out)");

// ── DATABASE ───────────────────────────────────────────────────────
rect(700, 742, 340, 84, "PostgreSQL (Prisma)\nusers · totp_accounts · backup_codes · verification_logs", { bg: "#e4e4e7", fontSize: 13 });

// ── FLOWS ──────────────────────────────────────────────────────────
// web -> backend (HTTP via proxy)
arrow([[510, 250], [620, 250]], { color: "#1e1e1e", label: "proxied HTTP" });
txt(508, 262, "cookie -> Bearer\nauto-refresh on 401", { size: 11, color: "#6b6b70" });

// mobile -> backend
arrow([[1180, 310], [1090, 310]], { color: "#1e1e1e", label: "direct HTTPS" });
txt(1088, 322, "Bearer from SecureStore\nsame refresh rules", { size: 11, color: "#6b6b70" });

// backend -> db
arrow([[855, 592], [855, 742]], { color: "#1e1e1e", label: "Prisma" });

// web -> mobile : QR hand-off (dashed, routed under backend)
arrow(
  [[295, 592], [295, 668], [1380, 668], [1380, 592]],
  { color: VIOLET, dashed: true, label: "scan QR — otpauth:// URI carries the secret (the ONLY hand-off)", labelAt: { x: 838, y: 668 } }
);

// mobile -> web : code proof (dashed, lower lane)
arrow(
  [[1300, 592], [1300, 712], [380, 712], [380, 592]],
  { color: VIOLET, dashed: true, label: "user types phone's 6-digit code into /test verify -> POST /verify", labelAt: { x: 840, y: 712 } }
);

// offline notes under client boxes
txt(96, 600, "codes generated OFFLINE from device clock —\nno network needed after enrollment", { size: 12, color: "#6b6b70", font: 3 });
txt(1196, 600, "same math, same clock window ->\nidentical codes on both devices", { size: 12, color: "#6b6b70", font: 3 });

// legend
txt(60, 800, "legend:", { size: 13 });
arrow([[140, 808], [200, 808]], {});
txt(210, 800, "HTTP call", { size: 12 });
arrow([[320, 808], [380, 808]], { color: VIOLET, dashed: true });
txt(390, 800, "secret / code-proof flow", { size: 12, color: VIOLET });
txt(600, 800, "open at excalidraw.com or via the VS Code Excalidraw extension", { size: 12, color: "#6b6b70" });

const out = {
  type: "excalidraw",
  version: 2,
  source: "vaultkey-generator",
  elements: els,
  appState: { viewBackgroundColor: "#ffffff", gridSize: null },
  files: {},
};

writeFileSync("C:/Lakshya/totp-auth-app/architecture.excalidraw", JSON.stringify(out, null, 2));
console.log(`written: ${els.length} elements`);
