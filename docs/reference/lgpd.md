# Referência — LGPD (mínimo viável)

Não somos advogados; isto é o mínimo operacional. **Valide com um advogado/contador antes do launch.**

## Princípio

Coletar **o mínimo**. KYC documental fica fora justamente pra não virar controlador de dado
sensível antes de ter receita que justifique o risco.

## Dados coletados no MVP

| Dado | Finalidade | Sensibilidade |
|---|---|---|
| Nome, email | Conta, contato | baixa |
| Telefone | Verificação (antifake), notificação | média |
| Foto de perfil | Higiene/identidade | média |
| Instagram (opcional) | Prova social | baixa |
| CPF (opcional, vendedor BR) | Payout PIX via PSP | **alta** |
| Endereço/rastreio (envio) | Logística da order | média |

> Documento/selfie **não** são coletados no MVP.

## Controles mínimos no launch

- **Política de Privacidade** + **Termos de Uso** publicados.
- **Base legal** definida (execução de contrato + consentimento onde aplicável).
- Consentimento no cadastro (aceite de termos).
- **Strip de EXIF/GPS** nas fotos (protege localização do usuário).
- Direito de exclusão: soft delete (`deleted_at`) + processo de apagar dados sob pedido.
- Dados de pagamento/CPF: **delegados ao PSP** sempre que possível (não armazenar dado de cartão; CPF só o necessário pro payout).

## Quando crescer (fase 2)

- Se um dia fizer KYC documental → **terceirizar** (Unico, Idwall, Serpro). Não armazenar documento cru.
- DPO/encarregado, registro de operações de tratamento, política de retenção.

## Gringos

- Usuários fora do BR: atenção a transferência internacional de dados (fase 2). No MVP,
  tratamento mínimo (telefone, email, foto) reduz exposição.
