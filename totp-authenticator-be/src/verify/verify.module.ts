import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';
import { DemoController } from './demo/demo.controller';
import { DemoService } from './demo/demo.service';
import { AuthModule } from '../auth/auth.module';
import { TotpModule } from '../totp/totp.module';

@Module({
  imports: [AuthModule, TotpModule, JwtModule.register({})],
  controllers: [VerifyController, DemoController],
  providers: [VerifyService, DemoService],
})
export class VerifyModule {}