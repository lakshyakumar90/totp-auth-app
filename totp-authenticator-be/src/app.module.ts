import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { TotpModule } from './totp/totp.module';
import { VerifyModule } from './verify/verify.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
      {
        name: 'verify',
        ttl: Number(process.env.VERIFY_RATE_LIMIT_TTL_SECONDS ?? 60) * 1000,
        limit: Number(process.env.VERIFY_RATE_LIMIT_MAX_ATTEMPTS ?? 5),
      },
    ]),
    PrismaModule,
    CommonModule,
    AuthModule,
    AccountsModule,
    TotpModule,
    VerifyModule,
  ],
})
export class AppModule {}