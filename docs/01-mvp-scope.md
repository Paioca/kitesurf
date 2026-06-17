# 01 — Escopo do MVP (ruthless)

Premissa: **3 meses, engenharia limitada, 1 hub (Cumbuco), pagamento dentro do MVP.**
Objetivo: provar que dois estranhos fecham um negócio porque o app os aproximou **e** que
o pagamento com escrow remove o medo do golpe.

Critério de corte: **se não aumenta transação ou confiança, fica fora.**

---

## MUST HAVE

| Feature | Por quê |
|---|---|
| Auth telefone OTP (aceita número internacional) + email | Antifake nº 2. 1 telefone = 1 conta. |
| Foto de perfil obrigatória + @Instagram opcional exibido | Higiene + prova social do nicho. |
| Criação de anúncio com **taxonomia controlada** (marca/modelo/ano/tamanho) + fotos guiadas | O diferencial nº 2. Ver [taxonomy](reference/taxonomy.md). |
| Browse + busca por categoria / tamanho / cidade — **sem login** | Destrava topo do funil. |
| Chat interno (texto + imagem) | Negociação dentro da plataforma. |
| **Pagamento via PSP com escrow** (PIX + cartão à vista) — começa nos acessórios enviáveis | Antifraude nº 1 + receita. Ver [05](05-payments-escrow.md). |
| "Marcar como vendido" + review pós-transação-paga | Fecha o ciclo; reputação real. |
| Notificação de mensagem/venda (push web + email) | Sem isso o chat morre. |

## SHOULD HAVE

| Feature | Por quê |
|---|---|
| Anúncio/selo de **negócio local** (escola, pousada) | Primeira receita recorrente. Ver [business-ads](modules/business-ads.md). |
| Limpeza automática (ping de 30 dias "ainda disponível?") | Qualidade percebida; diferencial barato. |
| Report/denúncia (botão → fila manual) | T&S essencial, barato. |
| PT + EN (i18n) | Gringos no hub. Barato agora, caro depois. |

## NICE TO HAVE (corta se atrasar)

- Favoritos / seguir vendedor.
- Perfil de PJ rico (escola/loja) além do selo de ad.
- Histórico de preços.

## REMOVE / ADIAR (decidido — não construir no MVP)

- KYC documental (selfie + documento).
- Passaporte de equipamento / número de série como feature.
- KiteScore.
- Detector de foto de IA / foto falsa.
- Reputação bilateral com 4 critérios → vira 1 estrela + comentário opcional.
- Payout internacional.
- Painel admin CRUD completo → SQL + scripts no começo.
- CPF obrigatório no cadastro (CPF só, opcional, pra payout PIX de vendedor BR).
- Frete automatizado / cálculo de frete → vendedor informa rastreio manual.
- Websocket sofisticado no dia 1 → começar com polling, evoluir pra Socket.IO se necessário.

---

## Definição de "pronto" do MVP

O MVP está pronto quando, em Cumbuco:

1. Um usuário cria conta com telefone verificado em < 1 min.
2. Navega e filtra anúncios por tamanho **sem logar**.
3. Cria um anúncio padronizado com fotos guiadas em < 5 min.
4. Conversa no chat interno e recebe notificação.
5. **Compra um acessório pagando online, com o dinheiro retido em escrow, e libera ao confirmar o recebimento.**
6. Avalia a contraparte após a compra.
7. Uma escola local aparece como parceiro pago.

Se esses 7 acontecem com usuários reais, o MVP cumpriu seu papel.
