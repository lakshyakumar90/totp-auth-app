import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Account } from './types';

const accountsKey = 'vaultkey.accounts';
const settingsKey = 'vaultkey.settings';
const accessTokenKey = 'vaultkey.accessToken';
const refreshTokenKey = 'vaultkey.refreshToken';
const expiryKey = 'vaultkey.accessTokenExpiresIn';

async function getValue(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}
async function setValue(key: string, value: string) {
  if (Platform.OS === 'web') { globalThis.localStorage?.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}
async function deleteValue(key: string) {
  if (Platform.OS === 'web') { globalThis.localStorage?.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
}

export async function readAccounts(): Promise<Account[]> { const raw = await getValue(accountsKey); return raw ? JSON.parse(raw) as Account[] : []; }
export async function writeAccounts(accounts: Account[]) { await setValue(accountsKey, JSON.stringify(accounts)); }
export async function readSettings() { const raw = await getValue(settingsKey); return raw ? JSON.parse(raw) as { locked: boolean; theme: 'dark' | 'light' } : { locked: false, theme: 'dark' as const }; }
export async function writeSettings(settings: { locked: boolean; theme: 'dark' | 'light' }) { await setValue(settingsKey, JSON.stringify(settings)); }

export async function getTokens() {
  const [accessToken, refreshToken, accessTokenExpiresIn] = await Promise.all([getValue(accessTokenKey), getValue(refreshTokenKey), getValue(expiryKey)]);
  return accessToken && refreshToken ? { accessToken, refreshToken, accessTokenExpiresIn: accessTokenExpiresIn || '' } : null;
}
export async function setTokens(tokens: { accessToken: string; refreshToken: string; accessTokenExpiresIn: string }) {
  await Promise.all([setValue(accessTokenKey, tokens.accessToken), setValue(refreshTokenKey, tokens.refreshToken), setValue(expiryKey, tokens.accessTokenExpiresIn)]);
}
export async function clearTokens() { await Promise.all([deleteValue(accessTokenKey), deleteValue(refreshTokenKey), deleteValue(expiryKey)]); }
export async function getToken() { return (await getTokens())?.accessToken ?? null; }