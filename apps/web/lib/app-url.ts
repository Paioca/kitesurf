const DEFAULT_APP_URL = 'https://www.kitetropos.com';

export function publicBaseUrl() {
  const raw = (process.env.APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '');
  try {
    const url = new URL(raw);
    if (url.hostname === 'kitetropos.com') url.hostname = 'www.kitetropos.com';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return DEFAULT_APP_URL;
  }
}

export function appUrl(path: string) {
  return `${publicBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function sessionCookieDomain() {
  const explicit = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;

  try {
    const host = new URL(publicBaseUrl()).hostname;
    if (host === 'www.kitetropos.com' || host === 'kitetropos.com') return '.kitetropos.com';
  } catch {}

  return undefined;
}
