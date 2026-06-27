import { describe, expect, it } from 'vitest';
import { notificationText } from '../lib/notification-copy';

describe('notificationText', () => {
  it('N2 — decisão da moderação não diz que ainda está em análise', () => {
    expect(notificationText({ type: 'reversal_rejected', data: { title: 'Kite X', byModerator: true } }))
      .toBe('A moderação manteve a venda de "Kite X".');
    expect(notificationText({ type: 'reversal_confirmed', data: { title: 'Kite X', byModerator: true } }))
      .toBe('A moderação reverteu a venda de "Kite X".');
  });

  it('mantém a copy de recusa pela contraparte como análise pendente', () => {
    expect(notificationText({ type: 'reversal_rejected', data: { title: 'Kite X' } }))
      .toBe('A correção da venda de "Kite X" não foi aceita. Está em análise.');
  });
});
