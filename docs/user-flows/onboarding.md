# Fluxo — Onboarding

## Princípio

Fricção mínima. **Navegar e buscar NÃO exigem conta.** Pedir cadastro só ao agir
(mensagear, anunciar, comprar).

## Fluxo (gatilho: usuário quer mensagear/anunciar/comprar)

1. Informa telefone (com DDI — suporta gringo)
2. Recebe OTP por SMS → valida (nível 1)
3. Informa nome + email → valida email (nível 0)
4. **Sobe foto de perfil (obrigatória)**
5. (Opcional) conecta `@Instagram`
6. Pronto — pode agir

> CPF **não** é pedido aqui. Só quando um vendedor BR vai configurar payout PIX.

## Idioma

- Detecta `locale` (PT/EN); usuário pode trocar.

## Regras

- 1 telefone = 1 conta.
- Rate limit no envio de OTP.

## Anti-fricção (não fazer)

- ❌ Não pedir CPF no cadastro.
- ❌ Não exigir login pra navegar/buscar.
- ❌ Não pedir documento/selfie.
