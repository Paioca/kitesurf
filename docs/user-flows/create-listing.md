# Fluxo — Criar anúncio

## Pré-condições

- Usuário autenticado (telefone verificado) com foto de perfil.

## Fluxo principal

1. "Novo anúncio"
2. Seleciona **categoria** (dropdown)
3. Seleciona **marca** e **modelo** (dropdowns da taxonomia) + **ano**
4. Preenche **atributos da categoria** (ex.: kite → tamanho m², estado, nº de reparos, tempo de uso)
5. Define **preço**, **cidade/spot**, e **se é enviável** (`shippable`)
6. Sobe fotos guiadas (mín 3, máx 20) — sistema orienta: completo, extremidades, reparos, válvulas, nº de série
7. (Opcional) descrição + número de série
8. Confirma → status `active`

## Regras

- Mín 3 / máx 20 fotos.
- Marca, modelo, categoria, preço obrigatórios.
- Atributos validados contra o schema da categoria.
- Strip de EXIF/GPS nas fotos.

## Decisão importante: `shippable`

- `true` (acessório/colete/peça) → entra no fluxo de **pagamento online + escrow**.
- `false` (kite/board grande) → presencial por padrão; pagamento online opcional.

## Exceções

- Upload falhou → preservar dados, permitir reenvio.
- Marca/modelo não existe → permitir "outro" (texto) com aprovação posterior.
