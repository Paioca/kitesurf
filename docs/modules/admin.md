# Módulo — Admin / Moderação

## Princípio

**Sem painel CRUD no MVP.** Volume de 1 hub não justifica construir admin. Use SQL + scripts.

## Operações necessárias (via SQL client / scripts)

- Banir usuário / telefone / device
- Remover ou arquivar anúncio
- Ver fila de denúncias (`Report`)
- **Resolver disputa de `Order`** (`disputed → released | refunded`) — ver [user-flows/dispute](../user-flows/dispute.md)
- Marcar anúncio como suspeito
- Métricas básicas (queries): usuários ativos, novos anúncios, vendidos, mensagens, conversão

## Quando construir painel

Só quando a moderação manual doer (volume de denúncias/disputas por dia atrapalhar). Provável
fase 2, não MVP.

## Segurança operacional

- Acesso ao banco restrito; trilha de quem fez o quê (log).
- Decisões de disputa registradas (mesmo que num doc/planilha no começo).
