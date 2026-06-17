import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

// Passo 1: pedir OTP para um telefone (com DDI — suporta gringo).
export class RequestOtpDto {
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'Telefone em formato E.164 (ex.: +5585999999999)' })
  phone!: string;

  @IsOptional()
  @IsString()
  phoneCountry?: string;
}

// Passo 2: validar OTP. Se conta nova, exige nome/email/foto (onboarding).
export class VerifyOtpDto {
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;

  // Campos de onboarding — obrigatórios só na criação da conta.
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
