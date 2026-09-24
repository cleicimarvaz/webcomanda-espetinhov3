# Fronteiras de domínio — V3

## Objetivo

Separar o sistema por responsabilidades de negócio. Um domínio pode chamar outro por contrato, mas não deve manipular diretamente o estado interno do outro.

## 1. Identidade e acesso

Responsável por:
- autenticação;
- sessão;
- usuários;
- papéis;
- permissões;
- vínculos empresa/unidade;
- contexto atual.

Não é responsável por vendas, estoque ou caixa.

## 2. Catálogo

Responsável por:
- categorias;
- produtos;
- preços;
- histórico de preços;
- combos/composições;
- complementos.

Não é responsável pelo saldo físico do estoque.

## 3. Estoque

Responsável por:
- saldos por unidade;
- entradas;
- saídas;
- ajustes;
- inventários;
- transferências.

Uma venda solicita uma saída; a venda não deve alterar saldo diretamente.

## 4. Atendimento

Responsável por:
- comandas;
- itens da comanda;
- pedidos/lotes de cozinha;
- estados de preparo;
- entrega;
- cancelamento de itens.

Atendimento não deve registrar pagamento diretamente.

## 5. Vendas

Responsável por:
- fechamento comercial;
- venda e itens;
- preço praticado;
- descontos;
- origem da venda;
- vínculo opcional com comanda/cliente/caixa;
- orquestração dos efeitos da venda.

Quando necessário, chama estoque, financeiro e auditoria por contratos.

## 6. Financeiro

Responsável por:
- pagamentos;
- caixa;
- contas a receber;
- despesas;
- estornos financeiros;
- conferência.

## 7. Eventos e ingressos

Responsável por:
- eventos;
- mesas do evento;
- reservas;
- patrocinadores;
- tipos de ingresso;
- ingressos;
- validações.

Fluxos públicos devem usar contratos específicos.

## 8. Relatórios

Somente leitura e derivação.

Relatórios não devem ser utilizados para atualizar fontes de verdade.

## 9. Impressão

Responsável por transformar um comando de impressão em uma saída compatível com:
- impressora térmica;
- navegador/PDF;
- dispositivos móveis;
- 58 mm e 80 mm.

Não deve decidir se uma venda pode ser concluída.

## 10. Infraestrutura

Responsável por:
- PWA;
- sincronização futura;
- configuração de ambiente;
- notificações;
- backup;
- monitoramento técnico.

## Dependências principais

\`\`\`text
Identidade/Acesso
      ↓
Organização
      ↓
Catálogo ─────→ Estoque
      ↓             ↑
Atendimento ───→ Vendas ───→ Financeiro
      ↓               ↓
   Cozinha         Auditoria

Eventos/Ingressos ─────────→ Financeiro/Auditoria

Todos os domínios ─────────→ Impressão/Notificações quando necessário
\`\`\`

## Regra de dependência

Uma dependência deve acontecer pelo contrato do caso de uso, não por acesso direto às tabelas de outro domínio.

Exemplo:

\`vendaServiceV3.finalizar()\` → \`estoqueServiceV3.registrarSaida()\`

e não:

\`vendaServiceV3\` → update direto em \`estoque_produto_unidade\`.
