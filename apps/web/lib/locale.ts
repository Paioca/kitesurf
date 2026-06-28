import 'server-only';
import { cookies } from 'next/headers';

export type Locale = 'pt' | 'en';

export async function getServerLocale(fallback?: string | null): Promise<Locale> {
  const cookieLocale = (await cookies()).get('kitetropos:locale')?.value;
  if (cookieLocale === 'en' || cookieLocale === 'pt') return cookieLocale;
  return fallback === 'en' ? 'en' : 'pt';
}
