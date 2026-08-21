export type Account = {
  id: string;
  issuer: string;
  label: string;
  secret?: string;
  algorithm?: string;
  digits?: number;
  period?: number;
  /** True when this account exists only on this device (e.g. imported via QR
   * and not matched to a server record). Sync must never drop these. */
  localOnly?: boolean;
};
export type PublicAccount = Omit<Account, 'secret'>;
export type BackupCodes = string[];