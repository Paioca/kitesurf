import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Storage de imagens. Em produção (Vercel serverless) o disco é efêmero/somente-leitura,
// então gravamos no Supabase Storage e servimos pela URL pública do bucket.
@Injectable()
export class StorageService {
  private readonly bucket = process.env.SUPABASE_BUCKET ?? 'listings';
  private client: SupabaseClient | null = null;

  private supabase(): SupabaseClient {
    if (this.client) return this.client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new InternalServerErrorException(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados.',
      );
    }
    this.client = createClient(url, key, { auth: { persistSession: false } });
    return this.client;
  }

  async save(buffer: Buffer, ext: string): Promise<string> {
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.supabase()
      .storage.from(this.bucket)
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new InternalServerErrorException(`Upload falhou: ${error.message}`);

    const { data } = this.supabase().storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
