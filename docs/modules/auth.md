# Módulo — Auth

## Objetivo

Cadastro/login com verificação de telefone (antifake nº 2), suportando brasileiros e gringos.

## Métodos

- **Telefone OTP (SMS)** — principal. Aceita número internacional (`phone_country`).
- **Email** — verificação (nível 0).
- Preferir OTP/magic link a senha. Se houver senha: hash forte (argon2/bcrypt).

## Níveis de verificação

| Nível | Requisito | Selo |
|---|---|---|
| 0 | Email validado | — |
| 1 | **Telefone validado (OTP)** | "Telefone verificado" |
| (futuro) | Documento | adiado — fora do MVP |

> Não há nível documental no MVP. Confiança vem de telefone + Instagram + escrow + reviews.

## Regras

- 1 telefone = 1 conta (chave de antifake e anti-multiconta).
- **Foto de perfil obrigatória** no onboarding (higiene).
- `@instagram_handle` opcional, exibido no perfil (prova social).
- `cpf` **não** é pedido no cadastro. Só aparece, opcional, quando vendedor BR vai configurar payout PIX.
- Rate limiting em envio de OTP (anti-abuso/custo de SMS).

## Fora do MVP

- Login social (Google/Apple) — nice to have, não bloqueia.
- KYC documental.

Ver fluxo completo: [user-flows/onboarding](../user-flows/onboarding.md).
