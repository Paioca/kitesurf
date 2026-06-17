# Fluxo — Disputa

Política **simples e escrita desde o dia 1**. Você vira juiz; mantenha objetivo.

## Quando

Comprador abre disputa quando order está `held` ou `shipped`:
- "Não chegou"
- "Chegou diferente do anunciado / quebrado"

## Fluxo (MVP — resolução manual)

1. Comprador clica "abrir disputa" → `Order.status = disputed` (liberação **travada**)
2. Sistema notifica vendedor + alerta admin
3. Ambos enviam evidências no chat (fotos do anúncio servem de baseline)
4. Admin avalia (via SQL/ferramenta) e decide:
   - Procedente → `refunded` (PSP estorna o comprador)
   - Improcedente → `released` (libera pro vendedor)
5. Decisão registrada (doc/planilha no MVP)

## Critérios objetivos (reduzem subjetividade)

- "Não chegou" + sem rastreio válido → tende a refund.
- "Não chegou" + rastreio entregue → tende a release.
- "Diferente do anunciado" → comparar fotos guiadas do anúncio × fotos do recebido.

## Prazos

- Comprador tem a janela de confirmação (7 dias pós-`shipped`) pra abrir disputa antes da auto-liberação.

## Mecânica do PSP

- Estorno (refund) e disputas de cartão (chargeback) / PIX MED são processados pelo PSP.
- Enquanto `disputed`, **nunca** liberar o split.

## Fora do MVP

- Fluxo automatizado de upload de evidências, SLA automático, mediação por terceiro.
