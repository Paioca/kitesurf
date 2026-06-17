# Módulo — Users / Perfis

## Objetivo

Perfil que comunica confiança sem KYC pesado.

## Perfil público exibe

- Nome + foto (obrigatória)
- Selo "Telefone verificado"
- `@Instagram` (se conectado) — prova social
- Nota média + nº de avaliações (de `Order` pagos)
- Itens vendidos / comprados
- Tempo de plataforma ("membro desde")
- Cidade / spot

## Tipos

- `individual` (PF)
- `business` (PJ) — escola, instrutor, loja, pousada. No MVP, PJ rica é nice-to-have; o produto de negócio é o `BusinessListing` (ver [business-ads](business-ads.md)).

## Campos sensíveis (privados)

- Telefone, email, CPF (nullable), `payout_account_id`.
- CPF só pra vendedor BR configurar payout. Tratamento LGPD: ver [reference/lgpd](../reference/lgpd.md).

## Regras

- Ownership: usuário só edita o próprio perfil.
- Soft delete (`deleted_at`) para direito de exclusão LGPD.
