import type { Account } from './types';

/**
 * Self-contained RFC 6238 TOTP engine — no otplib, no Node crypto.
 * otplib v12 depends on Node's `crypto` module, which Metro cannot resolve,
 * so the app would not bundle. Everything here is pure JS and synchronous.
 *
 * Exports the same surface the UI already used:
 *   getCounter, getRemaining, generateCode, formatCode, parseOtpAuthUri
 */

// ---------------------------------------------------------------------------
// Base32 (RFC 4648) decode
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) throw new Error('Invalid base32 character in secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// Hashes
// ---------------------------------------------------------------------------

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

type HashFn = (msg: Uint8Array) => Uint8Array;

export function sha1(msg: Uint8Array): Uint8Array {
  const ml = msg.length;
  const paddedLen = (((ml + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(msg);
  padded[ml] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 8, Math.floor(ml / 0x20000000));
  dv.setUint32(paddedLen - 4, (ml << 3) >>> 0);

  const w = new Uint32Array(80);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;

  for (let i = 0; i < paddedLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4);
    for (let j = 16; j < 80; j++) {
      w[j] = rotl32(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl32(a, 5) + f + e + k + w[j]) >>> 0;
      e = d; d = c; c = rotl32(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, h0); odv.setUint32(4, h1); odv.setUint32(8, h2);
  odv.setUint32(12, h3); odv.setUint32(16, h4);
  return out;
}

function rotl32(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(msg: Uint8Array): Uint8Array {
  const ml = msg.length;
  const paddedLen = (((ml + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(msg);
  padded[ml] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 8, Math.floor(ml / 0x20000000));
  dv.setUint32(paddedLen - 4, (ml << 3) >>> 0);

  const w = new Uint32Array(64);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  for (let i = 0; i < paddedLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr32(w[j - 15], 7) ^ rotr32(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr32(w[j - 2], 17) ^ rotr32(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[j] + w[j]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, idx) => odv.setUint32(idx * 4, v));
  return out;
}

function rotr32(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// SHA-512 via BigInt (Hermes supports BigInt; perf is irrelevant at 1 code/30s)
const SHA512_K: bigint[] = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
  0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
  0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
  0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
  0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
  0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
  0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
  0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
  0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
  0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
  0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
  0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
  0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
  0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
];

const MASK64 = 0xffffffffffffffffn;

function rotr64(x: bigint, n: number): bigint {
  return ((x >> BigInt(n)) | (x << BigInt(64 - n))) & MASK64;
}

export function sha512(msg: Uint8Array): Uint8Array {
  const ml = msg.length;
  // Block size 128; length field is 128-bit (16 bytes).
  const paddedLen = (((ml + 16) >> 7) + 1) << 7;
  const padded = new Uint8Array(paddedLen);
  padded.set(msg);
  padded[ml] = 0x80;
  const dv = new DataView(padded.buffer);
  const bitLen = BigInt(ml) * 8n;
  dv.setUint32(paddedLen - 16, Number((bitLen >> 96n) & 0xffffffffn));
  dv.setUint32(paddedLen - 12, Number((bitLen >> 64n) & 0xffffffffn));
  dv.setUint32(paddedLen - 8, Number((bitLen >> 32n) & 0xffffffffn));
  dv.setUint32(paddedLen - 4, Number(bitLen & 0xffffffffn));

  const W: bigint[] = new Array(80);
  let h = [
    0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
    0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n,
  ];

  for (let i = 0; i < paddedLen; i += 128) {
    for (let j = 0; j < 16; j++) {
      W[j] = (dv.getBigUint64(i + j * 8));
    }
    for (let j = 16; j < 80; j++) {
      const s0 = rotr64(W[j - 15], 1) ^ rotr64(W[j - 15], 8) ^ (W[j - 15] >> 7n);
      const s1 = rotr64(W[j - 2], 19) ^ rotr64(W[j - 2], 61) ^ (W[j - 2] >> 6n);
      W[j] = (W[j - 16] + s0 + W[j - 7] + s1) & MASK64;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let j = 0; j < 80; j++) {
      const S1 = rotr64(e, 14) ^ rotr64(e, 18) ^ rotr64(e, 41);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA512_K[j] + W[j]) & MASK64;
      const S0 = rotr64(a, 28) ^ rotr64(a, 34) ^ rotr64(a, 39);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) & MASK64;
      hh = g; g = f; f = e; e = (d + t1) & MASK64;
      d = c; c = b; b = a; a = (t1 + t2) & MASK64;
    }
    const next = [a, b, c, d, e, f, g, hh];
    h = h.map((v, idx) => (v + next[idx]) & MASK64);
  }

  const out = new Uint8Array(64);
  const odv = new DataView(out.buffer);
  h.forEach((v, idx) => odv.setBigUint64(idx * 8, v));
  return out;
}

// ---------------------------------------------------------------------------
// HMAC (RFC 2104), generic over hash + block size
// ---------------------------------------------------------------------------

function hmac(hash: HashFn, blockSize: number, key: Uint8Array, msg: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > blockSize) k = hash(k);
  const padded = new Uint8Array(blockSize);
  padded.set(k);
  const inner = new Uint8Array(blockSize);
  const outer = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    inner[i] = padded[i] ^ 0x36;
    outer[i] = padded[i] ^ 0x5c;
  }
  return hash(concat(outer, hash(concat(inner, msg))));
}

type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export function hmacFor(algorithm: Algorithm): (key: Uint8Array, msg: Uint8Array) => Uint8Array {
  switch (algorithm) {
    case 'SHA256': return (key, msg) => hmac(sha256, 64, key, msg);
    case 'SHA512': return (key, msg) => hmac(sha512, 128, key, msg);
    default: return (key, msg) => hmac(sha1, 64, key, msg);
  }
}

// ---------------------------------------------------------------------------
// HOTP (RFC 4226) / TOTP (RFC 6238)
// ---------------------------------------------------------------------------

export function getCounter(period = 30, now = Date.now()): number {
  return Math.floor(now / 1000 / period);
}

export function getRemaining(period = 30, now = Date.now()): number {
  const elapsed = Math.floor(now / 1000) % period;
  return period - elapsed;
}

function hotp(key: Uint8Array, counter: number, digits: number, algorithm: Algorithm): string {
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setUint32(4, counter >>> 0);
  const mac = hmacFor(algorithm)(key, msg);
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

/** Generate the current TOTP code for an account with a cached secret. */
export function generateCode(account: Account, now = Date.now()): string {
  if (!account.secret) {
    throw new Error('This account has no cached secret on this device.');
  }
  const algorithm = (account.algorithm ?? 'SHA1').toUpperCase() as Algorithm;
  const digits = account.digits ?? 6;
  const period = account.period ?? 30;
  return hotp(base32Decode(account.secret), getCounter(period, now), digits, algorithm);
}

export function formatCode(code: string): string {
  const middle = Math.ceil(code.length / 2);
  return code.slice(0, middle) + ' ' + code.slice(middle);
}

// ---------------------------------------------------------------------------
// otpauth:// URI parsing
// ---------------------------------------------------------------------------

export interface OtpAuthParts {
  issuer: string;
  label: string;
  secret: string;
  algorithm: string;
  digits: number;
  period: number;
}

export function parseOtpAuthUri(uri: string): OtpAuthParts {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'otpauth:') throw new Error('Not an otpauth QR code');
  const pathLabel = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const issuer = parsed.searchParams.get('issuer') || pathLabel.split(':')[0] || 'Account';
  const label = pathLabel.includes(':') ? pathLabel.split(':').slice(1).join(':') : pathLabel;
  const secret = parsed.searchParams.get('secret');
  if (!secret) throw new Error('This QR code does not include a secret');
  return {
    issuer,
    label: label || issuer,
    secret: secret.replace(/\s/g, '').toUpperCase(),
    algorithm: parsed.searchParams.get('algorithm') || 'SHA1',
    digits: Number(parsed.searchParams.get('digits') || 6),
    period: Number(parsed.searchParams.get('period') || 30),
  };
}