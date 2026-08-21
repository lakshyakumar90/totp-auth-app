import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  issuer!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  label!: string;
}