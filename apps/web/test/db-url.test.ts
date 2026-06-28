import { afterEach, describe, expect, it, vi } from 'vitest';
import { databaseUrlInfo, prismaRuntimeDatabaseUrl } from '../lib/db-url';

describe('prismaRuntimeDatabaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('troca Supabase session pooler por transaction pooler em produção', () => {
    const url = prismaRuntimeDatabaseUrl(
      'postgresql://postgres.proj:secret@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
      'production',
    );

    const parsed = new URL(url!);
    expect(parsed.port).toBe('6543');
    expect(parsed.searchParams.get('pgbouncer')).toBe('true');
    expect(parsed.searchParams.get('connection_limit')).toBe('1');
    expect(parsed.searchParams.get('pool_timeout')).toBe('10');
  });

  it('preserva limites explícitos quando a URL já veio ajustada', () => {
    const url = prismaRuntimeDatabaseUrl(
      'postgresql://postgres.proj:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=3&pool_timeout=20',
      'production',
    );

    const parsed = new URL(url!);
    expect(parsed.port).toBe('6543');
    expect(parsed.searchParams.get('pgbouncer')).toBe('true');
    expect(parsed.searchParams.get('connection_limit')).toBe('3');
    expect(parsed.searchParams.get('pool_timeout')).toBe('20');
  });

  it('não altera a URL fora de produção', () => {
    const raw = '"postgresql://kite:kite@localhost:5432/kite?schema=public"';

    expect(prismaRuntimeDatabaseUrl(raw, 'test')).toBe('postgresql://kite:kite@localhost:5432/kite?schema=public');
  });

  it('expõe apenas metadados não sensíveis para diagnóstico', () => {
    expect(
      databaseUrlInfo(
        'postgresql://postgres.proj:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
      ),
    ).toEqual({
      configured: true,
      hostname: 'aws-0-sa-east-1.pooler.supabase.com',
      port: '6543',
      isSupabasePooler: true,
      pgbouncer: true,
      hasConnectionLimit: true,
      hasPoolTimeout: false,
    });
  });
});
