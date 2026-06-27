import { afterEach, describe, expect, it, vi } from 'vitest';
import { appUrl, publicBaseUrl, sessionCookieDomain } from '../lib/app-url';

describe('app-url', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('canonicaliza kitetropos.com para www.kitetropos.com', () => {
    vi.stubEnv('APP_URL', 'https://kitetropos.com');

    expect(publicBaseUrl()).toBe('https://www.kitetropos.com');
    expect(appUrl('/pedidos')).toBe('https://www.kitetropos.com/pedidos');
  });

  it('canonicaliza o host legado do Vercel para o domínio público', () => {
    vi.stubEnv('APP_URL', 'https://kitesurf-web.vercel.app');

    expect(publicBaseUrl()).toBe('https://www.kitetropos.com');
    expect(sessionCookieDomain()).toBe('.kitetropos.com');
  });

  it('preserva hosts que não são o domínio principal', () => {
    vi.stubEnv('APP_URL', 'https://staging.kitetropos.com/');

    expect(publicBaseUrl()).toBe('https://staging.kitetropos.com');
    expect(appUrl('recuperar')).toBe('https://staging.kitetropos.com/recuperar');
  });

  it('deriva o domínio compartilhado de sessão só para produção principal', () => {
    vi.stubEnv('APP_URL', 'https://www.kitetropos.com');
    expect(sessionCookieDomain()).toBe('.kitetropos.com');

    vi.stubEnv('APP_URL', 'https://kitesurf-web.vercel.app');
    expect(sessionCookieDomain()).toBe('.kitetropos.com');
  });

  it('permite override explícito do domínio de sessão', () => {
    vi.stubEnv('APP_URL', 'https://staging.kitetropos.com');
    vi.stubEnv('SESSION_COOKIE_DOMAIN', '.staging.kitetropos.com');

    expect(sessionCookieDomain()).toBe('.staging.kitetropos.com');
  });
});
