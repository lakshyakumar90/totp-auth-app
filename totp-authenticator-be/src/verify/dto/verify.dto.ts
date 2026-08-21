import {
  IsString,
  IsOptional,
  Matches,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class VerifyDto {
  @ValidateIf((o: VerifyDto) => !o.secret)
  @IsUUID()
  accountId?: string;

  @ValidateIf((o: VerifyDto) => !o.accountId)
  @IsString()
  @IsOptional()
  secret?: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code!: string;
}

export class VerifyBackupDto {
  @IsUUID()
  accountId!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'invalid backup code format' })
  code!: string;
}