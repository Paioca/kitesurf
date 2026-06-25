import { describe, it, expect } from 'vitest';
import { canTransition, isEditable, type ListingStatus } from '../lib/listing-status';

describe('canTransition', () => {
  it('active ↔ paused é livre', () => {
    expect(canTransition('active', 'paused')).toBe(true);
    expect(canTransition('paused', 'active')).toBe(true);
  });

  it('active/paused → archived é permitido', () => {
    expect(canTransition('active', 'archived')).toBe(true);
    expect(canTransition('paused', 'archived')).toBe(true);
  });

  it('sold é terminal — nada sai dele', () => {
    expect(canTransition('sold', 'active')).toBe(false);
    expect(canTransition('sold', 'paused')).toBe(false);
    expect(canTransition('sold', 'archived')).toBe(false);
  });

  it('archived é reversível: republicação archived → active/paused (soft-deleted é barrado no caller)', () => {
    expect(canTransition('archived', 'active')).toBe(true);
    expect(canTransition('archived', 'paused')).toBe(true);
  });

  it('no-op (from === to) é idempotente', () => {
    for (const s of ['draft', 'active', 'paused', 'sold', 'archived'] as ListingStatus[]) {
      expect(canTransition(s, s)).toBe(true);
    }
  });
});

describe('isEditable', () => {
  it('draft/active/paused são editáveis', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('active')).toBe(true);
    expect(isEditable('paused')).toBe(true);
  });

  it('sold/archived não são editáveis', () => {
    expect(isEditable('sold')).toBe(false);
    expect(isEditable('archived')).toBe(false);
  });
});
