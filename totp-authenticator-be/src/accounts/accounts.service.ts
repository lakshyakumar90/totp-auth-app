import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { TotpService } from '../totp/totp.service';
import { CreateAccountDto } from './dto/create-account.dto';

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;
const BCRYPT_ROUNDS = 12;

export interface AccountSummary {
  id: string;
  issuer: string;
  label: string;
}

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly totp: TotpService,
  ) {}

  /**
   * Create a new 2FA account entry for a user. Generates a unique random
   * base32 secret, stores it AES-256-GCM encrypted, and returns the
   * otpauth URI + QR + single-use backup codes (shown only once).
   */
  async createAccount(userId: string, dto: CreateAccountDto) {
    const secret = this.totp.generateSecret();
    const encryptedSecret = this.crypto.encrypt(secret);

    const account = await this.prisma.totpAccount.create({
      data: { userId, issuer: dto.issuer, label: dto.label, encryptedSecret },
    });

    const backupCodes = await this.generateBackupCodes(account.id);
    const otpauthUri = this.totp.buildOtpAuthUri(dto.issuer, dto.label, secret);
    const qrCode = await this.totp.toDataUrl(otpauthUri);

    return {
      id: account.id,
      issuer: dto.issuer,
      label: dto.label,
      otpauthUri,
      qrCode,
      backupCodes,
    };
  }

  private async generateBackupCodes(accountId: string): Promise<string[]> {
    const codes: string[] = [];
    const hashes: string[] = [];

    // Hash outside the transaction — bcrypt is slow and would blow the
    // Prisma interactive-transaction timeout.
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = randomBytes(BACKUP_CODE_LENGTH).toString('base64url');
      codes.push(code);
      hashes.push(await bcrypt.hash(code, BCRYPT_ROUNDS));
    }

    await this.prisma.backupCode.createMany({
      data: hashes.map((codeHash) => ({ accountId, codeHash })),
    });

    return codes;
  }

  async listAccounts(userId: string): Promise<AccountSummary[]> {
    const accounts = await this.prisma.totpAccount.findMany({
      where: { userId },
      select: { id: true, issuer: true, label: true },
      orderBy: { createdAt: 'asc' },
    });
    return accounts;
  }

  async deleteAccount(userId: string, accountId: string) {
    await this.assertOwnership(userId, accountId);
    await this.prisma.totpAccount.delete({ where: { id: accountId } });
    return { success: true };
  }

  /**
   * Server-side code generation (fallback / sync-only path). Decrypts the
   * secret and returns the current code + seconds until it rolls over.
   */
  async generateCode(userId: string, accountId: string) {
    const account = await this.findOwnedAccount(userId, accountId);
    const secret = this.crypto.decrypt(account.encryptedSecret);
    const code = this.totp.generateCode(secret);
    const stepMs = 30_000;
    const expiry = Math.ceil(
      (Math.floor(Date.now() / stepMs) * stepMs + stepMs - Date.now()) / 1000,
    );
    return { code, expiresInSeconds: expiry };
  }

  /**
   * Sync endpoint: returns encrypted secrets so clients can decrypt (or the
   * app decrypts over TLS) for offline generation. Never exposes raw secret.
   */
  async sync(userId: string) {
    const accounts = await this.prisma.totpAccount.findMany({
      where: { userId },
      select: { id: true, issuer: true, label: true, encryptedSecret: true },
    });
    return accounts;
  }

  /** Ownership-aware fetch. Throws 404 if the account doesn't exist or isn't the user's. */
  async findOwnedAccount(userId: string, accountId: string) {
    const account = await this.prisma.totpAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  private async assertOwnership(userId: string, accountId: string) {
    const account = await this.prisma.totpAccount.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!account) {
      throw new ForbiddenException('Account not found or not owned by you');
    }
  }
}