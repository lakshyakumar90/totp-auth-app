"use client";

const DB_NAME = "totp-vault";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const SECRET_STORE = "secrets";
const KEY_NAME = "master";
const SECRET_KEY_NAME = "secret-key";
const IV_LENGTH = 12;

interface SecretRecord {
  accountId: string;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE);
      }
      if (!db.objectStoreNames.contains(SECRET_STORE)) {
        db.createObjectStore(SECRET_STORE, { keyPath: "accountId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function idbPut(store: string, value: unknown, key?: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const req = key
          ? tx.objectStore(store).put(value, key)
          : tx.objectStore(store).put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

/** Get or create the non-extractable AES-GCM key used to encrypt secrets. */
async function getMasterKey(): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(KEY_STORE, KEY_NAME);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false, // non-extractable: cannot be exported by script
    ["encrypt", "decrypt"],
  );
  await idbPut(KEY_STORE, key, KEY_NAME);
  return key;
}

export async function encryptSecret(
  accountId: string,
  secret: string,
): Promise<void> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  await idbPut(SECRET_STORE, {
    accountId,
    iv: iv.buffer as ArrayBuffer,
    ciphertext,
  } satisfies SecretRecord);
}

export async function decryptSecret(
  accountId: string,
): Promise<string | null> {
  try {
    const key = await getMasterKey();
    const record = await idbGet<SecretRecord>(SECRET_STORE, accountId);
    if (!record) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: record.iv },
      key,
      record.ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

export async function deleteSecret(accountId: string): Promise<void> {
  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SECRET_STORE, "readwrite");
        tx.objectStore(SECRET_STORE).delete(accountId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** True when a cached (decryptable) secret exists for an account. */
export async function hasCachedSecret(accountId: string): Promise<boolean> {
  return (await decryptSecret(accountId)) !== null;
}

export { SECRET_KEY_NAME };