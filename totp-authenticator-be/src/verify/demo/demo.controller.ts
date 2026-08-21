import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AccountThrottlerGuard } from '../guards/account-throttler.guard';
import { DemoService } from './demo.service';
import { IsString, IsUUID, Matches } from 'class-validator';
import { LoginDto } from '../../auth/dto/auth.dto';

class FinishLoginDto {
  @IsString()
  loginToken!: string;

  @IsUUID()
  accountId!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code!: string;
}

@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  startLogin(@Body() dto: LoginDto) {
    return this.demo.startLogin(dto.email, dto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login/verify')
  @UseGuards(AccountThrottlerGuard)
  @Throttle({ verify: { ttl: 60_000, limit: 5 } })
  finishLogin(@Body() dto: FinishLoginDto) {
    return this.demo.finishLogin(dto.loginToken, dto.accountId, dto.code);
  }
}