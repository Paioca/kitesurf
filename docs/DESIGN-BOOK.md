# Design Book v2 — Premium (referência canônica)

> Capturado do handoff Claude Design "Design Book v2 - Premium" (2026). Esta é a
> **fonte da verdade visual** da Kitetropos. Derive a UI daqui — não invente.
> A marca é **Kitetropos**. **Nunca** "Kite Life" nem "Vaya" (nomes internos antigos).

## Essência
Marketplace P2P de equipamento de kitesurf. "More than kites." Confiança vem de
identidade verificada + contato estruturado + reputação real. Traços: confiável, de
praia, honesto, comunitário, direto.

## O que torna v2 "premium": MOVIMENTO, não cor nova
1. **Calma na cor, energia no movimento** — paleta de praia fica; energia entra por escala, recorte, assimetria, animação. Nunca cor berrante.
2. **Respira, depois grita** — muito espaço ao redor de poucos elementos enormes; o contraste vazio × manchete cria a tensão premium.
3. **O losango em velocidade** — o símbolo nunca aparece parado/decorativo. Rastro, direção, aceleração: assinatura de movimento. Ou tem função (bullet/selo) ou tem movimento.
4. **Palcos escuros com ritmo** — alternar seções de areia clara com palcos verde-profundo.
- **Reveal-on-scroll:** cascata curta (~80ms entre itens). **Hover:** −3px + sombra, .18s (resposta esportiva). **Sombras:** sempre esverdeadas, nunca cinza neutro.

## Cores
**Disciplina do ouro:** a paleta não muda; o que muda é o uso. **Dourado = acento raro, UMA ação por tela.** Selos, chips e marcadores são **VERDE, não ouro**. Escassez faz o ouro parecer premium.

| Grupo | Token | Hex |
|---|---|---|
| Marca | Verde pinheiro (primária) | `#1f6b5c` |
| | Verde profundo (palco) | `#0c2520` |
| | Verde rodapé | `#14302a` |
| | Verde-água | `#7fbcae` |
| | Dourado · acento (1 ação/tela) | `#d9a86b` |
| | Dourado claro | `#e7c79a` |
| Superfícies | Areia base | `#f6f3ec` |
| | Areia 2 | `#efe9dc` |
| | Tan seção | `#ece3d2` |
| | Branco quente | `#fbfaf6` |
| | Tinta | `#23332e` |
| Texto | Forte / Médio / Suave | `#23332e` / `#48564f` / `#6b7a73` |
| | Apoio / Placeholder / Borda | `#8a948d` / `#9aa49d` / `#e6dfd0` |
| Tints/estados | Tint verde / concluído / areia | `#e8f1ec` / `#cfe3d9` / `#f1ebdd` |
| | Alerta / Tint alerta | `#c0492f` / `#fbeae4` |

## Tipografia
**Archivo** (manchete & interface) + **Spectral** (editorial: eyebrow itálico & citações; no premium não disputa o título com a Archivo).

| Papel | Spec |
|---|---|
| Manchete | Archivo 900 caps · `letter-spacing:-2px` · `line-height:0.9` |
| Título seção | Archivo 900 caps · `-1.5px` · `0.95` |
| Eyebrow | Spectral itálico · ~21px · `#1f6b5c` |
| Preço | Archivo 900 · `-1.5px` |
| Corpo | Archivo 400 · 16px · `#48564f` |
| Rótulo | Archivo 800 · 13px caps · `letter-spacing:0.5px` |

## Forma & espaço
- **Raios:** 8px tags · 11px botões · 16px cards · 999px pílulas.
- **Espaçamento:** 6 · 9 · 13 · 18 · 24 · 36 · 56.
- **Sombra/elevação:** esverdeada (nunca cinza). Hover eleva; palcos escuros criam ritmo.

## Componentes
- **Botões:** **só o CTA principal é dourado** (= 1 ação por tela). Todo o resto é verde ou neutro.
- **Chips & selos:** **VERDE, não ouro** (Kite, Barra, "12 m²", Verificado, Concluído, Atenção).
- **Campos:** limpos (borda, foco verde, sem drop-shadow). [Auditoria mobile: 48px, 16px anti-zoom iOS.]
- **Card de anúncio:** foto + ficha padronizada + preço Archivo 900.

## Fotografia
Ação full-bleed (kite/vento/água/pôr do sol) **sempre com gradiente pinheiro** pra legibilidade. Produto = estúdio limpo (nunca no chão/cerca). Placeholder listrado diagonal — nunca ao lado de foto real na mesma grade.

## Voz & tom
Direto e curto (cabe num WhatsApp), honestidade em primeiro (recompensa quem descreve fielmente, bloqueia quem omite), linguagem da comunidade (kite, barra, spot, sessão, vento — inclusive com gringo), calor com firmeza.
- **Escreva assim:** "Pode testar antes no spot." · "Sem pagamento aqui — combinem direto no WhatsApp." · "Omitir defeito leva a banimento."
- **Evite:** juridiquês tipo "Realize sua transação com total segurança em nossa plataforma…".

## Pendências de reconciliação código × book (a tratar quando "atualizar o book")
- **Ouro fora do CTA:** `components/ListingCard.tsx` usa `color.gold` em selo "+ Barra"/"do kit" — o book manda selos em VERDE. Conferir outros usos de ouro que não sejam o CTA principal.
- **Nome legado:** comentários e `DRAFT_KEY='vaya:anunciar-draft'` citam "Kite Life"/"Vaya". Não é user-facing, mas o book proíbe esses nomes.
