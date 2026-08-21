import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { TotpService } from '../totp/totp.service';
import * as bcrypt from 'bcrypt';

export interface VerifyResult {
  valid: boolean;
  delta?: number;
  step?: string; // serialized BigInt time-step (JSON.stringify throws on bigint)
  reason?: string;
}

@Injectable()
export class VerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly totp: TotpService,
  ) {}

  /**
   * Verify a TOTP code for an account owned by the given user.
   * Combines otplib window tolerance (point 4) with replay protection (point 5)
   * and logs every attempt.
   */
  async verifyAccount(
    userId: string,
    accountId: string,
    code: string,
  ): Promise<VerifyResult> {
    const account = await this.prisma.totpAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const result = await this.verifyAgainstSecret(
      account.encryptedSecret,
      code,
      userId,
      accountId,
    );
    return result;
  }

  /**
   * Stateless verify against a raw secret (no replay protection possible).
   * Intended for callers who hold the secret themselves and just need a
   * server-side double check.
   */
  async verifyStateless(secret: string, code: string): Promise<VerifyResult> {
    const delta = this.totp.checkCode(secret, code);
    if (delta === null) {
      await this.logAttempt(null, null, false, null);
      return { valid: false, reason: 'invalid_code' };
    }
    await this.logAttempt(null, null, true, BigInt(delta));
    return { valid: true, delta };
  }

  private async verifyAgainstSecret(
    encryptedSecret: string,
    code: string,
    userId: string,
    accountId: string,
  ): Promise<VerifyResult> {
    const secret = this.crypto.decrypt(encryptedSecret);
    const delta = this.totp.checkCode(secret, code);

    if (delta === null) {
      await this.logAttempt(userId, accountId, false, null);
      return { valid: false, reason: 'invalid_code' };
    }

    const matchedStep = this.totp.currentStep() + BigInt(delta);

    // Replay protection (point 5): reject if the matched time-step is not
    // strictly newer than the last accepted step for this account. Done
    // atomically so concurrent submissions can't both pass.
    const updated = await this.prisma.totpAccount.updateMany({
      where: {
        id: accountId,
        userId,
        lastAcceptedStep: { lt: matchedStep },
      },
      data: { lastAcceptedStep: matchedStep },
    });

    if (updated.count === 0) {
      await this.logAttempt(userId, accountId, false, matchedStep);
      return { valid: false, reason: 'replay' };
    }

    await this.logAttempt(userId, accountId, true, matchedStep);
    // Serialize BigInt as a string — JSON.stringify throws on BigInt values,
    // which would 500 the response AFTER the verification already succeeded.
    return { valid: true, delta, step: matchedStep.toString() };
  }

  /**
   * Consume a single-use backup code for an account owned by the user.
   */
  async verifyBackup(userId: string, accountId: string, code: string) {
    const account = await this.prisma.totpAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const backups = await this.prisma.backupCode.findMany({
      where: { accountId, usedAt: null },
    });

    for (const backup of backups) {
      if (await bcrypt.compare(code, backup.codeHash)) {
        // Mark used atomically to prevent double-use.
        const claimed = await this.prisma.backupCode.updateMany({
          where: { id: backup.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claimed.count === 1) {
          await this.logAttempt(userId, accountId, true, null, 'backup');
          return { valid: true };
        }
      }
    }

    await this.logAttempt(userId, accountId, false, null, 'backup');
    return { valid: false, reason: 'invalid_or_used' };
  }

  private async logAttempt(
    userId: string | null,
    accountId: string | null,
    success: boolean,
    step: bigint | null,
    kind: 'totp' | 'backup' = 'totp',
  ) {
    // Logging is best-effort and must never throw into the request path.
    try {
      await this.prisma.verificationLog.create({
        data: {
          userId: userId ?? 'anonymous',
          accountId,
          success,
          step,
          kind,
        },
      });
    } catch {
      // ignore
    }
  }
}