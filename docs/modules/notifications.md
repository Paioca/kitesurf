# Módulo — Notificações

## Objetivo

Trazer o usuário de volta. Sem notificação, o chat e as orders morrem.

## Canais (MVP)

- **Push web** (PWA / Web Push API)
- **Email** (provider transacional: Resend / SES / Postmark)
- **In-app** (badge/contador)

## Eventos que notificam (MVP)

| Evento | Canais |
|---|---|
| Nova mensagem no chat | push + email |
| Pagamento confirmado (order `held`) | push + email (vendedor: "envie o item") |
| Vendedor informou rastreio (`shipped`) | push + email (comprador) |
| Order liberada (`released`) | push + email (vendedor: "você recebeu") |
| Disputa aberta | push + email (ambos) + alerta admin |
| Ping de limpeza (30 dias) | email |

## Regras

- Preferências mínimas (ligar/desligar email).
- Não spammar; agrupar quando possível.

## Fora do MVP

- Alertas de busca salva, "seguir vendedor", digest semanal.
