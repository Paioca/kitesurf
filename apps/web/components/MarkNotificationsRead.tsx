'use client';
// Marca as notificações como lidas ao abrir a caixa de Pedidos — sem uma tela que
// faça isso, o contador do badge (notificações não-lidas) só acumulava. Dispara
// uma vez no mount; o badge é relido na próxima navegação.
import { useEffect } from 'react';

export function MarkNotificationsRead() {
  useEffect(() => {
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{}', // sem ids = marca todas as não-lidas do usuário
    })
      // Avisa o badge pra zerar na hora — sem esperar o polling de 45s (queixa do audit:
      // "o número não some ao abrir as negociações").
      .then(() => window.dispatchEvent(new Event('notifications-read')))
      .catch(() => {});
  }, []);
  return null;
}
