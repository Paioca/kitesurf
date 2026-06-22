# Contrato editorial — Kitetropos

Este documento define a linguagem factual da Fase 0. O design continua derivando de
`apps/web/lib/tokens.ts`, `components/ui.tsx` e do bundle Claude Design. Este
contrato não autoriza novos componentes visuais; ele orienta apenas o texto exibido
nas superfícies existentes.

## Verdades do produto

- A Kitetropos conecta compradores e vendedores; não vende os itens anunciados.
- Anunciar e negociar é gratuito na Fase 0. A plataforma não processa pagamento nem
  cobra comissão nesta fase.
- O telefone é verificado por código enviado por SMS. Foto de perfil é obrigatória.
- O comprador compartilha seu contato ao enviar uma oferta ou pedir uma visita. O
  vendedor compartilha seu WhatsApp ao aceitar o pedido.
- Demonstrar interesse não confirma preço nem conclui a venda. Pagamento, entrega e
  eventuais ajustes de preço são combinados diretamente entre as partes.
- A venda entra no histórico depois que comprador e vendedor confirmam na plataforma.
- Avaliações ficam públicas segundo as regras de confirmação do negócio.
- A Kitetropos nasce em Cumbuco, mas é posicionada para a comunidade global do
  kitesurf. Cumbuco é origem e primeiro hub, não limite geográfico.

## Promessas permitidas

- Telefone verificado.
- Foto de perfil obrigatória.
- Ficha e fotos padronizadas.
- Contato estruturado.
- Avaliações vinculadas a negócios confirmados.
- Mais contexto para negociar com confiança.

## Promessas proibidas

- Identidade, CPF, pessoa ou item verificado.
- Instagram conectado ou verificado.
- Ambiente sem golpes ou garantia contra fraude.
- Reputação impossível de manipular.
- Foto comprovadamente real.
- Garantia de pagamento, entrega ou condição do equipamento.

## Vocabulário oficial

| Conceito | Usar | Evitar |
| --- | --- | --- |
| Categoria | Kite + barra | Combo, kit completo |
| As duas peças | Conjunto | Pacote |
| Componentes | Só o kite, Só a barra | Avulso, sozinho |
| Opção do vendedor | Vender separado | Vender avulso |
| Reputação | Avaliação | Review |
| Autenticação | Código por SMS | OTP |
| Encontro | Pedido de visita | Agendamento |
| Ausência em visita | Não comparecer sem avisar | No-show |

## Tom de voz

- Português brasileiro direto, acolhedor e curto.
- Explicar a consequência da ação antes de pedir confirmação.
- Reservar linguagem punitiva para Termos e moderação; não tratar o usuário honesto
  como suspeito durante a jornada normal.
- Preferir evidência concreta a adjetivos como “real”, “seguro” ou “sem golpe”.
- Não usar emoji que não faça parte do design aprovado.
- Usar “Meus anúncios” para o inventário publicado pelo usuário e “Minhas
  negociações” para ofertas, pedidos de visita e negócios enviados ou recebidos.

## Regra para copy de estado

Toda mensagem de estado deve responder, nesta ordem:

1. O que aconteceu.
2. O que isso significa para o usuário.
3. Qual é o próximo passo, quando existir.

As mensagens de pedido e venda devem ser derivadas do estado real do domínio, nunca
de uma suposição visual isolada.
