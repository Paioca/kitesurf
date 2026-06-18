import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private otp: OtpService,
    private jwt: JwtService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const devCode = await this.otp.generate(dto.phone);
    // devCode só é preenchido no modo mock (OTP_MOCK=true) — facilita teste sem SMS.
    return {
      ok: true,
      message: 'Código enviado por SMS.',
      ...(devCode ? { devCode } : {}),
    };
  }

  // Verifica OTP. Telefone novo -> cria conta (exige onboarding completo).
  // Telefone existente -> login.
  async verifyOtp(dto: VerifyOtpDto) {
    const valid = await this.otp.verify(dto.phone, dto.code);
    if (!valid) throw new UnauthorizedException('Código inválido ou expirado.');

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

    if (!user) {
      // Onboarding — docs/user-flows/onboarding.md.
      if (!dto.name || !dto.email || !dto.avatarUrl) {
        throw new BadRequestException({
          needsOnboarding: true,
          message: 'Conta nova: nome, email e foto de perfil são obrigatórios.',
        });
      }
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) throw new ConflictException('Email já cadastrado.');

      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          phoneCountry: dto.phone.startsWith('+55') ? 'BR' : (dto.locale ?? 'INT'),
          phoneVerified: true,
          name: dto.name,
          email: dto.email,
          avatarUrl: dto.avatarUrl,
          instagramHandle: dto.instagramHandle ?? null,
          locale: dto.locale ?? 'pt',
        },
      });
    } else {
      if (!user.phoneVerified) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { phoneVerified: true },
        });
      }
    }

    if (user.status === 'blocked') throw new UnauthorizedException('Conta bloqueada.');

    return { token: this.sign(user.id), user: this.publicUser(user) };
  }

  private sign(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  private publicUser(u: any) {
    return {
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      instagramHandle: u.instagramHandle,
      phoneVerified: u.phoneVerified,
      locale: u.locale,
      role: u.role,
    };
  }
}
