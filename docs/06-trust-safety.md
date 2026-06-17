# 06 — Trust & Safety (antifraude)

Premissa: **golpistas existem e vão tentar.** O medo nº 1 do projeto.

## Princípio central

> **O pagamento É o antifraude. Não cace "foto de IA".**

Detectar foto falsa / gerada por IA é caro, impreciso (bane gente real, deixa passar foto
roubada do Instagram alheio) e dá **falsa sensação de segurança**. Golpe não é sobre a foto
do perfil — é sobre o dinheiro. Resolva o dinheiro.

## Stack de confiança (em ordem de potência × custo)

1. **Escrow no pagamento** — o mais forte. Dinheiro retido até confirmação. Ver [05](05-payments-escrow.md).
2. **Telefone verificado (OTP)** — 1 número = 1 conta. Custo de chip é o antifake. Funciona pra gringo.
3. **Vínculo com Instagram** — a comunidade de kite vive no IG. Exibir o @ conectado é prova social baratíssima e potente *neste nicho*. Quem tem feed de kite há anos não é golpista de ocasião.
4. **Reviews atreladas a `Order` pago** — reputação não-gameável (só quem pagou avalia).
5. **Report + banir por telefone/device** — manual no começo.
6. **Foto de perfil obrigatória** — **higiene, não mecanismo de confiança.** Opcional: API pronta de face-detection só pra "tem rosto humano? sim/não". Nada de detector de IA.

## Vetores de fraude e mitigação (baixo custo)

| Vetor | Mitigação MVP |
|---|---|
| Golpe do PIX (pega e some) | **Escrow** (resolve a maioria) |
| Anúncio falso | Telefone + IG + report + fotos guiadas |
| Conta falsa / multi-conta | 1 telefone = 1 conta; banir por telefone/device |
| Equipamento roubado | Campo opcional de nº de série; **strip de GPS nas fotos** protege endereço do vendedor; futuro: registro comunitário de "roubado" |
| Manipulação de review | Só `Order` pago gera review; 1 por par |
| Spam no chat | Rate limit + report + shadowban manual |
| Disintermediação p/ WhatsApp | Aceitar que acontece no gear grande; no enviável, escrow dá motivo real pra ficar |

## Equipamento roubado — oportunidade

Dor real e específica do kite (gear caro, fácil revender). Um **registro comunitário de "roubado"**
(reportado pela própria comunidade) pode virar diferencial de confiança mais forte e barato que KYC.
**Fora do MVP**, mas anotar como candidato forte de fase 2.

## Segurança técnica mínima (MVP)

- **Ownership checks** em toda ação (dono do anúncio, participante da conversa).
- Rate limiting: cadastro, OTP, mensagens, criação de anúncio.
- Strip de EXIF/GPS no upload.
- Validação de tipo/tamanho de imagem; reprocessamento server-side.
- OTP/magic link preferível a senha; se senha, hash forte.

## O que NÃO fazer

- ❌ KYC documental (selfie + documento) no MVP.
- ❌ Detector de foto de IA / "não é pessoa real".
- ❌ Armazenar documento cru. (Se um dia fizer KYC, terceirize: Unico, Idwall, Serpro.)
