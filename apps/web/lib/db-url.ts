export function prismaRuntimeDatabaseUrl(raw = process.env.DATABASE_URL, nodeEnv = process.env.NODE_ENV) {
  if (!raw) return raw;
  if (nodeEnv !== 'production') return raw;

  try {
    const url = new URL(raw);
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');

    if (isSupabasePooler && url.port === '5432') {
      url.port = '6543';
    }
    if (isSupabasePooler && url.port === '6543') {
      url.searchParams.set('pgbouncer', 'true');
    }
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.PRISMA_CONNECTION_LIMIT || '1');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT || '10');
    }

    return url.toString();
  } catch {
    return raw;
  }
}
