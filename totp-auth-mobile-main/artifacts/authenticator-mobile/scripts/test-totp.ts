// RFC 6238 / RFC 4226 validation for lib/totp.ts
// Run: node --experimental-strip-types scripts/test-totp.ts
import { createHash, createHmac } from 'node:crypto';
import { base32Decode, generateCode, getCounter, parseOtpAuthUri } from '../lib/totp.ts';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got=${actual} want=${expected}`}`);
}

const enc = new TextEncoder();

// --- Hash sanity vs node:crypto ---
import { sha1, sha256, sha512 } from '../lib/totp.ts';
function hex(b: Uint8Array) { return Buffer.from(b).toString('hex'); }
check('sha1("abc")', hex(sha1(enc.encode('abc'))), createHash('sha1').update('abc').digest('hex'));
check('sha256("abc")', hex(sha256(enc.encode('abc'))), createHash('sha256').update('abc').digest('hex'));
check('sha512("abc")', hex(sha512(enc.encode('abc'))), createHash('sha512').update('abc').digest('hex'));
const long = enc.encode('The quick brown fox jumps over the lazy dog'.repeat(10));
check('sha1(long)', hex(sha1(long)), createHash('sha1').update(long).digest('hex'));
check('sha512(long)', hex(sha512(long)), createHash('sha512').update(long).digest('hex'));

// --- HMAC vs node:crypto (incl. key > block size path) ---
import { hmacFor } from '../lib/totp.ts';
for (const alg of ['SHA1', 'SHA256', 'SHA512'] as const) {
  const key = enc.encode('key');
  const msg = enc.encode('The quick brown fox jumps over the lazy dog');
  check(`hmac-${alg}`, hex(hmacFor(alg)(key, msg)), createHmac(alg.toLowerCase(), key).update(msg).digest('hex'));
  const bigKey = enc.encode('k'.repeat(200)); // forces hash(key) branch
  check(`hmac-${alg}-longkey`, hex(hmacFor(alg)(bigKey, msg)), createHmac(alg.toLowerCase(), bigKey).update(msg).digest('hex'));
}

// --- Base32 roundtrip ---
check('base32 "MZXW6===" -> foo', Buffer.from(base32Decode('MZXW6===')).toString(), 'foo');
check('base32 "JBSWY3DPEHPK3PXP"', hex(base32Decode('JBSWY3DPEHPK3PXP')), '48656c6c6f21deadbeef');
check('base32 lowercase+spaces', Buffer.from(base32Decode('mzxw6 ===')).toString(), 'foo');

// --- RFC 6238 vectors ---
// NOTE: the RFC uses DIFFERENT seed lengths per algorithm:
//   SHA1 -> 20 bytes, SHA256 -> 32 bytes, SHA512 -> 64 bytes (all ASCII digits).
function base32Encode(bytes: Uint8Array): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += A[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += A[(value << (5 - bits)) & 31];
  return out;
}
const seedFor = (alg: string) => {
  const ascii =
    alg === 'SHA256' ? '12345678901234567890123456789012'
    : alg === 'SHA512' ? '1234567890123456789012345678901234567890123456789012345678901234'
    : '12345678901234567890';
  return base32Encode(enc.encode(ascii));
};
const acct = (alg: string): Parameters<typeof generateCode>[0] => ({
  id: 'x', issuer: 't', label: 't',
  secret: seedFor(alg), algorithm: alg, digits: 8, period: 30,
});
const t = (sec: number) => sec * 1000;
check('RFC6238 SHA1 T=59', generateCode(acct('SHA1'), t(59)), '94287082');
check('RFC6238 SHA256 T=59', generateCode(acct('SHA256'), t(59)), '46119246');
check('RFC6238 SHA512 T=59', generateCode(acct('SHA512'), t(59)), '90693936');
check('RFC6238 SHA1 T=1111111109', generateCode(acct('SHA1'), t(1111111109)), '07081804');
check('RFC6238 SHA256 T=1111111109', generateCode(acct('SHA256'), t(1111111109)), '68084774');
check('RFC6238 SHA512 T=1111111109', generateCode(acct('SHA512'), t(1111111109)), '25091201');
check('RFC6238 SHA1 T=1234567890', generateCode(acct('SHA1'), t(1234567890)), '89005924');
check('RFC6238 SHA256 T=1234567890', generateCode(acct('SHA256'), t(1234567890)), '91819424');
check('RFC6238 SHA512 T=1234567890', generateCode(acct('SHA512'), t(1234567890)), '93441116');
check('RFC6238 SHA1 T=2000000000', generateCode(acct('SHA1'), t(2000000000)), '69279037');
check('RFC6238 SHA512 T=20000000000', generateCode(acct('SHA512'), t(20000000000)), '47863826');

// --- 6-digit default + counter sanity ---
check('counter at T=59', getCounter(30, t(59)), 1);
check('6-digit code shape', /^\d{6}$/.test(generateCode({ id: 'x', issuer: 'i', label: 'l', secret: seedFor('SHA1') })), true);

// --- otpauth URI parsing ---
const uri = 'otpauth://totp/GitHub:octocat%40gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30';
const p = parseOtpAuthUri(uri);
check('parse issuer', p.issuer, 'GitHub');
check('parse label', p.label, 'octocat@gmail.com');
check('parse secret', p.secret, 'JBSWY3DPEHPK3PXP');

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);