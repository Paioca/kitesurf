# Tarefa de agente — template

Copie este bloco ao abrir uma tarefa para Claude ou Codex. O objetivo é dar
**escopo e propriedade temporária** para os dois agentes trabalharem em paralelo
sem se atropelar.

---

## Agente
`Claude` | `Codex`

## Worktree / branch
- Diretório: `../kitetropos-<agente>`
- Branch: `feat/<agente>-<tarefa-curta>`

## Domínio (propriedade temporária)
<!-- ex: "negociação e máquina de estados" / "galeria e acessibilidade" -->

## Arquivos que ESTE agente pode tocar
<!-- liste caminhos. Quem assume o domínio assume também os testes e docs dele. -->
-
-

## Arquivos PROIBIDOS nesta tarefa
<!-- domínio do outro agente; evita conflito invisível -->
-

## Mudança de banco?
- [ ] Não
- [ ] Sim — **confirmar que nenhum outro agente está mexendo no schema agora**

## Critério de pronto
- [ ] CI verde
- [ ] Preview testado
- [ ] PR aberta para `staging`

---

### Regras fixas
1. Uma tarefa = uma branch = um worktree.
2. Só **uma** feature com mudança de banco por vez.
3. Nunca push direto em `main`. PR feature → `staging` → (aprovação) → `main`.
4. Migration sempre retrocompatível (expand → migrate → contract).
