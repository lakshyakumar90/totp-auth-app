import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateSync,
  verifySync,
  generateSecret as otplibGenerateSecret,
  generateURI,
  createGuardrails,
} from 'otplib';
import * as QRCode from 'qrcode';

// otplib v13 enforces >=16-byte secrets by default; accounts created under
// the previous version have 10-byte ones. Relax the floor so they keep
// verifying instead of throwing SecretTooShortError.
const GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 8 });

@Injectable()
export class TotpService {
  private readonly window: number;

  constructor(config: ConfigService) {
    this.window = Number(config.get<number>('TOTP_WINDOW') ?? 1);
  }

  /** 160-bit secret (32 unpadded base32 chars). */
  generateSecret(): string {
    return otplibGenerateSecret({ length: 20 });
  }

  /** Build an otpauth:// URI suitable for scanning into another app. */
  buildOtpAuthUri(issuer: string, label: string, secret: string): string {
    return generateURI({
      issuer,
      label,
      secret,
      algorithm: 'sha1',
      digits: 6,
      period: 30,
    });
  }

  /** Return a data-URL QR code PNG for an otpauth:// URI. */
  async toDataUrl(uri: string): Promise<string> {
    return QRCode.toDataURL(uri, { width: 320, margin: 2 });
  }

  /** Generate the current 6-digit TOTP code for a given secret. */
  generateCode(secret: string): string {
    return generateSync({ secret, guardrails: GUARDRAILS });
  }

  /**
   * Verify a code against a secret with drift tolerance of ±`window` steps.
   * Returns the matched delta (-window..0..+window) when valid, else null.
   */
  checkCode(secret: string, code: string): number | null {
    const result = verifySync({
      secret,
      token: code,
      epochTolerance: this.window * 30,
      guardrails: GUARDRAILS,
    });
    return result.valid ? result.delta : null;
  }

  /** The current RFC 6238 time step (T = floor(unixTime / 30)). */
  currentStep(nowMs = Date.now()): bigint {
    return BigInt(Math.floor(nowMs / 1000 / 30));
  }
}