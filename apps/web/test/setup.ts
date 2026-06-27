import { vi } from 'vitest';

// next/headers e Sentry só funcionam no runtime do Next — mock global pros testes.
vi.mock('next/headers', () => ({
  cookies: () => ({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }),
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureRequestError: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
  init: vi.fn(),
}));
