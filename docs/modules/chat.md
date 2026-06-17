# Módulo — Chat

## Objetivo

Negociação dentro da plataforma.

## Funcionalidades (MVP)

- Texto
- Imagem
- Marcação de lido (`read_at`)
- Histórico permanente
- Notificação de nova mensagem (push web + email)

## Implementação

- **MVP: polling** (intervalo curto). Suficiente pro volume inicial.
- Evoluir pra WebSocket/Socket.IO só quando o volume justificar.

## Estrutura

- 1 anúncio → múltiplas conversas.
- 1 conversa → exatamente 1 comprador + 1 vendedor.
- Status: `open / archived / blocked`.

## Regras

- **Ownership:** conversa só visível aos 2 participantes (checagem em toda leitura/escrita).
- Rate limiting (anti-spam).
- Botão de report dentro da conversa → fila de moderação.

## Realidade da disintermediação

No gear grande, o usuário vai puxar pro WhatsApp — aceite. No acessório enviável, o **escrow**
é o motivo concreto de fechar dentro da plataforma (proteção do dinheiro). Não tente bloquear
número de telefone na mensagem no MVP (gera fricção e é fácil de burlar).
