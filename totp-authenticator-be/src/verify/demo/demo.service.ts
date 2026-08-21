import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { VerifyService } from '../verify.service';
import * as bcrypt from 'bcrypt';

const LOGIN_TOKEN_TTL = '2m';

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly verify: VerifyService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Step 1 of a two-step relying-party login. Validates a real user's
   * credentials and returns their own account id (plus a short-lived login
   * token that binds the identity for step 2).
   */
  async startLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const account = await this.prisma.totpAccount.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException(
        'This user has no TOTP account yet. Add one via POST /api/accounts first.',
      );
    }

    const loginToken = await this.jwt.signAsync(
      { sub: user.id },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: LOGIN_TOKEN_TTL },
    );

    return { requiresTotp: true, accountId: account.id, loginToken };
  }

  /**
   * Step 2. Verifies the code for the user's OWN account only.
   * CRITICAL: the accountId is re-checked against the step-1 userId so User A's
   * code can never be validated against User B's secret.
   */
  async finishLogin(
    loginToken: string,
    accountId: string,
    code: string,
  ): Promise<{ success: boolean; reason?: string; session?: any }> {
    // Recover the authenticated identity from step 1.
    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(loginToken, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Login token is invalid or expired');
    }

    // Ownership check — never verify against an account that isn't this user's.
    const account = await this.prisma.totpAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      return {
        success: false,
        reason: 'Account does not belong to this user',
      };
    }

    const result = await this.verify.verifyAccount(userId, accountId, code);
    if (!result.valid) {
      return { success: false, reason: result.reason ?? 'invalid_code' };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const session = await this.auth.issueTokens(user!.id, user!.email);
    return { success: true, session };
  }
}