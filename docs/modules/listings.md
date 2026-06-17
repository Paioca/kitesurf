# Módulo — Anúncios (Listings)

## Objetivo

Anúncios **padronizados** — o diferencial nº 2. Padronização real = taxonomia controlada,
não texto livre.

## Criação — campos

### Obrigatórios
- Categoria (dropdown): Kite, Barra, Twin Tip, Surfboard, Foil, Trapézio, Acessórios
- Marca (dropdown — `Brand`), Modelo (dropdown — `Model`), Ano
- Atributos da categoria (`attributes` jsonb, validado contra `Category.attribute_schema`):
  - Kite: tamanho (m²), estado de conservação, nº de reparos, tempo de uso estimado
  - Trapézio: tamanho de cinta
  - etc. (ver [reference/taxonomy](../reference/taxonomy.md))
- Preço
- Cidade / spot (do **anúncio**, não do dono)
- `shippable` (define fluxo de pagamento — ver [05](../05-payments-escrow.md))
- Fotos (mín 3, máx 20)

### Opcional
- Descrição livre (sugestão, não regra rígida de 100 caracteres)
- Número de série (quando existir)

## Fotos guiadas

Orientar o vendedor a enviar fotos específicas (reduz fraude, aumenta confiança):
- Equipamento completo
- Detalhes das extremidades
- Reparos
- Válvulas
- Número de série (se houver)

Upload: **strip de EXIF/GPS**, validação de tipo/tamanho, reprocessamento (thumb/resize).

## Status

`draft → active → paused → sold → archived`

- `active`: publicado.
- `sold`: marcado como vendido (via `Order` pago OU botão manual no gear presencial).
- `archived`: oculto pela limpeza automática (sem confirmação em 30 dias).

## Regras

- Mín 3 / máx 20 fotos.
- Preço, marca, modelo, categoria obrigatórios.
- Ownership: só o dono edita/pausa/arquiva.
- `last_confirmed_at` alimenta a limpeza automática.

## Limpeza automática

A cada 30 dias sem confirmação, pergunta "ainda disponível?" → Sim / Vendido / Remover.
Sem resposta → `archived` (oculto). Diferencial barato de qualidade.

## Exceções

- Upload falhou → manter dados preenchidos, permitir reenviar fotos.
