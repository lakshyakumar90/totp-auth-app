import type { Account } from './types';

/**
 * Presentation selector for the home screen.
 *
 * Rules:
 *  1. Never show two accounts holding the SAME secret (rescan twins).
 *  2. Hide unpaired accounts (no cached secret) when a PAIRED account with
 *     the same issuer+label exists — the paired one supersedes them.
 *  3. Collapse remaining unpaired accounts sharing issuer+label into a single
 *     card (web wizard re-runs create identical-looking orphans).
 *
 * Settings still receives the FULL list so orphans can be deleted explicitly.
 */
export function selectVisibleAccounts(accounts: Account[]): Account[] {
  const keyOf = (a: Account) => `${a.issuer}::${a.label}`;

  const pairedKeys = new Set<string>();
  for (const a of accounts) if (a.secret) pairedKeys.add(keyOf(a));

  const shownSecrets = new Set<string>();
  const shownUnpaired = new Set<string>();
  const out: Account[] = [];

  for (const a of accounts) {
    if (a.secret) {
      if (shownSecrets.has(a.secret)) continue; // same-secret twin
      shownSecrets.add(a.secret);
      out.push(a);
      continue;
    }
    if (pairedKeys.has(keyOf(a))) continue; // superseded by a paired sibling
    const k = keyOf(a);
    if (shownUnpaired.has(k)) continue; // identical orphan -> one card
    shownUnpaired.add(k);
    out.push(a);
  }
  return out;
}