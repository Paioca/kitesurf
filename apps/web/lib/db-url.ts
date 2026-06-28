function cleanDatabaseUrl(raw?: string) {
  if (!raw) return raw;
  return raw.trim().replace(/^['"]|['"]$/g, '');
}

export function databaseUrlInfo(raw = process.env.DATABASE_URL) {
  const cleaned = cleanDatabaseUrl(raw);
  if (!cleaned) return { configured: false as const };

  try {
    const url = new URL(cleaned);
    return {
      configured: true as const,
      hostname: url.hostname,
      port: url.port || '(default)',
      isSupabasePooler: url.hostname.endsWith('.pooler.supabase.com'),
      pgbouncer: url.searchParams.get('pgbouncer') === 'true',
      hasConnectionLimit: url.searchParams.has('connection_limit'),
      hasPoolTimeout: url.searchParams.has('pool_timeout'),
    };
  } catch {
    return { configured: true as const, invalid: true as const };
  }
}

export function prismaRuntimeDatabaseUrl(raw = process.env.DATABASE_URL, nodeEnv = process.env.NODE_ENV) {
  const cleaned = cleanDatabaseUrl(raw);
  if (!cleaned) return cleaned;
  if (nodeEnv !== 'production') return cleaned;

  try {
    const url = new URL(cleaned);
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
    return cleaned;
  }
}
