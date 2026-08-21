import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/auth.guards';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

interface AuthedRequest extends Request {
  user: { sub: string; email: string };
}

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateAccountDto) {
    return this.accounts.createAccount(req.user.sub, dto);
  }

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.accounts.listAccounts(req.user.sub);
  }

  @Get('sync')
  sync(@Req() req: AuthedRequest) {
    return this.accounts.sync(req.user.sub);
  }

  @Get(':id/code')
  code(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.accounts.generateCode(req.user.sub, id);
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Req() req: AuthedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.accounts.deleteAccount(req.user.sub, id);
  }
}