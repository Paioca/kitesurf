# 05 — Pagamento + Escrow ⚠️ módulo mais pesado

Este é o coração do diferencial (antifraude nº 1) e o módulo de maior risco legal/operacional.
Leia inteiro antes de codar.

---

## Regra de ouro (inegociável)

> **Você NUNCA toca, recebe ou repassa o dinheiro diretamente.**
> Use um PSP com split/escrow nativo de marketplace. Se você intermediar dinheiro por conta
> própria, vira **instituição de pagamento de fato** (risco regulatório BACEN) e herda PCI,
> chargeback e responsabilidade total. Não faça.

O PSP cuida de: retenção (escrow/saldo), split automático da sua comissão, **PIX MED**
(devolução por fraude), chargeback de cartão, e payout pro vendedor.

## Escolha do PSP (primeiro spike do Bloco 3)

Critérios: split nativo + saldo retido (escrow) + PIX + cartão + onboarding razoável.

- **Asaas** e **Pagar.me** são os candidatos default (BR, split, escrow, PIX).
- **Stripe Connect** entra se cartão internacional (gringo) virar prioridade.

⚠️ **Aprovação da SUA conta no PSP** (eles fazem KYC sobre você/empresa) pode levar dias.
Iniciar onboarding na **Semana 6**, não na 8.

---

## Quando há pagamento online

| Tipo de anúncio | Pagamento |
|---|---|
| **Acessório enviável** (`shippable = true`) | **Online + escrow** (MVP foca aqui) |
| **Equipamento grande** (`shippable = false`) | Presencial por padrão; pagamento online **opcional** se ambos toparem |

Razão: escrow protege de verdade no enviável (paga → retém → envia → confirma → libera).
No presencial (ticket alto, entrega na mão), muitos preferem PIX presencial — não force.

---

## Máquina de estados do `Order`

```
pending    → comprador iniciou checkout, aguardando confirmação do PSP
held       → pagamento confirmado, dinheiro RETIDO (escrow). Vendedor é avisado pra enviar.
shipped    → vendedor informou rastreio (tracking_code)
released   → comprador confirmou recebimento OU auto-liberação por prazo → split + payout
refunded   → cancelado/disputa procedente → estorno ao comprador
disputed   → comprador abriu disputa; liberação travada até resolução manual
cancelled  → não pago / expirado
```

### Transições

- `pending → held`: webhook do PSP confirma pagamento.
- `held → shipped`: vendedor insere rastreio (manual no MVP — sem cálculo de frete).
- `shipped → released`: comprador clica "confirmei o recebimento" **OU** auto-liberação após **X dias** (sugestão: 7 dias após `shipped_at`).
- `held/shipped → disputed`: comprador abre disputa ("não chegou" / "chegou diferente").
- `disputed → refunded | released`: resolução **manual** (admin via SQL no MVP).
- `pending → cancelled`: timeout de pagamento.

> Liberação dispara o **split** no PSP: vendedor recebe `amount - fee`, plataforma recebe `fee`.

---

## Antifraude embutido no fluxo

- **Escrow** = golpista não pega o dinheiro e some. Resolve ~95% do golpe de PIX dos grupos de FB.
- **Rastreio obrigatório** pra liberar (no enviável) = prova de envio.
- **Janela de confirmação** = comprador tem tempo de verificar antes de liberar.
- Fotos guiadas do anúncio = evidência em disputa.

## Riscos novos que pagamento traz (e mitigação)

| Risco | Mitigação |
|---|---|
| **PIX MED / chargeback** (golpista compra, recebe, abre disputa) | Escrow + rastreio + janela + PSP absorve a mecânica. Reter liberação enquanto disputa aberta. |
| **"Não chegou / chegou quebrado"** — você vira juiz | Política de disputa **simples e escrita desde o dia 1**; fotos como evidência; decisão manual. |
| **Responsabilidade fiscal** sobre a comissão | Emissão de nota sobre o `fee`. **Contador desde o início.** |
| **Vendedor não envia** | Auto-refund se `held` não virar `shipped` em N dias. |

Política de disputa do MVP: ver [user-flows/dispute](user-flows/dispute.md).

## Fora do MVP

- Payout internacional pra vendedor gringo.
- Cálculo/etiqueta de frete automatizado (vendedor cola rastreio manual).
- Parcelamento (cartão à vista só no MVP, se simples).
