import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

// Geração/validação de OTP por SMS. No MVP o envio é "mockado":
// o código aparece no log da API até plugar um provider (Twilio/Zenvia).
@Injectable()
export class OtpService {
  private readonly logger = new Logger('OTP');
  private readonly ttl = Number(process.env.OTP_TTL_SECONDS ?? 300);
  private readonly mock = (process.env.OTP_MOCK ?? 'true') === 'true';

  constructor(private prisma: PrismaService) {}

  async generate(phone: string): Promise<void> {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + this.ttl * 1000);

    await this.prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });
    await this.send(phone, code);
  }

  // Retorna true se o código confere e não expirou; consome o código.
  async verify(phone: string, code: string): Promise<boolean> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;
    if (otp.attempts >= 5) return false;

    const ok = await bcrypt.compare(code, otp.codeHash);
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 }, consumed: ok ? true : undefined },
    });
    return ok;
  }

  private async send(phone: string, code: string): Promise<void> {
    if (this.mock) {
      this.logger.warn(`[MOCK SMS] OTP para ${phone}: ${code}`);
      return;
    }
    // TODO: integrar provider real de SMS (Twilio/Zenvia) quando sair do mock.
    this.logger.error('OTP_MOCK=false mas nenhum provider de SMS está integrado.');
  }
}
