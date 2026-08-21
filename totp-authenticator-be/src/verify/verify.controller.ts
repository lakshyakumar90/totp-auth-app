import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { AccountThrottlerGuard } from './guards/account-throttler.guard';
import { VerifyService } from './verify.service';
import { VerifyDto, VerifyBackupDto } from './dto/verify.dto';

interface AuthedRequest extends Request {
  user?: { sub: string; email: string };
}

@Controller('verify')
export class VerifyController {
  constructor(private readonly verify: VerifyService) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  @UseGuards(OptionalJwtAuthGuard, AccountThrottlerGuard)
  @Throttle({ verify: { ttl: 60_000, limit: 5 } })
  verifyCode(@Req() req: AuthedRequest, @Body() dto: VerifyDto) {
    if (dto.secret) {
      return this.verify.verifyStateless(dto.secret, dto.code);
    }
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.verify.verifyAccount(req.user.sub, dto.accountId!, dto.code);
  }

  @HttpCode(HttpStatus.OK)
  @Post('backup')
  @UseGuards(JwtAuthGuard, AccountThrottlerGuard)
  @Throttle({ verify: { ttl: 60_000, limit: 5 } })
  verifyBackup(@Req() req: AuthedRequest, @Body() dto: VerifyBackupDto) {
    return this.verify.verifyBackup(req.user!.sub, dto.accountId, dto.code);
  }
}