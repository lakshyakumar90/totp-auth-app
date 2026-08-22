export interface AccountSummary {
  id: string;
  issuer: string;
  label: string;
}

export interface CreatedAccount {
  id: string;
  issuer: string;
  label: string;
  otpauthUri: string;
  qrCode: string;
  backupCodes: string[];
}

export interface CodeResponse {
  code: string;
  expiresInSeconds: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export interface DemoStart {
  requiresTotp: boolean;
  accountId: string;
  loginToken: string;
}

export interface DemoFinish {
  success: boolean;
  reason?: string;
  session?: AuthTokens;
}