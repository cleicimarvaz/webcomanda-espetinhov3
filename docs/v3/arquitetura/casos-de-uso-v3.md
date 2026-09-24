# Casos de uso e operações centrais — V3

Este documento liga as funções existentes da aplicação aos casos de uso que deverão existir na arquitetura V3.

Os casos de uso descritos como V3 são contratos conceituais. Eles não significam que o banco ou os serviços correspondentes já estejam implantados.

## 1. Identidade e organização

| Caso de uso | Entrada principal | Saída | Domínio |
|---|---|---|---|
| Entrar no sistema | credencial | sessão/identidade | Identidade |
| Encerrar sessão | sessão atual | sessão encerrada | Identidade |
| Consultar vínculos | usuário autenticado | empresas/unidades/papéis | Organização |
| Selecionar unidade | unidade autorizada | contexto ativo | Organização |
| Gerenciar usuário | perfil + vínculos | usuário atualizado | Identidade/Organização |
| Gerenciar papel | papel + permissões | papel atualizado | Autorização |

## 2. Catálogo

| Caso de uso | Resultado esperado |
|---|---|
| Cadastrar produto | produto disponível no catálogo |
| Alterar produto | catálogo atualizado com histórico quando necessário |
| Ativar/inativar produto | disponibilidade alterada |
| Gerenciar categoria | categoria padronizada e ordenável |
| Gerenciar preço | preço vigente definido sem perder histórico |
| Gerenciar combo | composição registrada |
| Gerenciar complemento | opção reutilizável cadastrada |
| Associar complemento ao produto | regras de disponibilidade definidas |

## 3. Estoque

| Caso de uso | Resultado esperado |
|---|---|
| Consultar estoque | saldo por produto e unidade |
| Registrar entrada | saldo atualizado + movimento + auditoria |
| Registrar saída | saldo atualizado + movimento + auditoria |
| Executar inventário | contagem conciliada + movimentos de ajuste |
| Transferir estoque | saída na origem + entrada no destino |
| Consultar histórico | linha do tempo das movimentações |

## 4. Atendimento

| Caso de uso | Resultado esperado |
|---|---|
| Abrir comanda | comanda aberta para uma unidade |
| Lançar itens | itens registrados na comanda |
| Enviar lançamento para cozinha | pedido de produção criado |
| Alterar quantidade | item ajustado com histórico quando necessário |
| Cancelar item | item cancelado sem apagar histórico |
| Consultar fila da cozinha | pedidos ordenados por situação/tempo |
| Marcar item pronto | produção atualizada |
| Entregar pedido | etapa operacional registrada |

## 5. Venda

| Caso de uso | Resultado esperado |
|---|---|
| Finalizar venda balcão | venda concluída + pagamento + efeitos financeiros/estoque |
| Fechar comanda | venda ligada à comanda + pagamentos + efeitos financeiros/estoque |
| Dividir conta | partes da venda/pagamento registradas |
| Registrar desconto | desconto aplicado com autorização quando exigida |
| Registrar fiado | venda ligada a conta a receber |
| Estornar venda | efeitos financeiros e de estoque revertidos conforme regra |

## 6. Caixa

| Caso de uso | Resultado esperado |
|---|---|
| Abrir caixa | sessão de caixa aberta para a unidade |
| Registrar suprimento | entrada identificada no caixa |
| Registrar sangria | retirada identificada no caixa |
| Associar pagamento ao caixa | pagamento rastreável até a sessão |
| Fechar caixa | conferência final registrada |
| Consultar histórico de caixas | histórico por unidade/período |

## 7. Financeiro

| Caso de uso | Resultado esperado |
|---|---|
| Lançar conta a receber | débito do cliente registrado |
| Registrar recebimento | pagamento parcial ou total registrado |
| Lançar despesa | obrigação financeira registrada |
| Registrar pagamento de despesa | quitação parcial ou total registrada |
| Consultar metas | metas por escopo e período |
| Consultar fluxo financeiro | dados derivados de fontes oficiais |

## 8. Eventos e ingressos

| Caso de uso | Resultado esperado |
|---|---|
| Criar evento | evento disponível para gestão |
| Configurar mesas | capacidade/ocupação estruturada |
| Registrar reserva | reserva ligada a mesas e cliente |
| Criar tipo de ingresso | lote/tipo com regras de venda |
| Emitir ingresso | ingresso individual com código único |
| Vender ingresso | venda vinculada ao ingresso |
| Validar ingresso | tentativa registrada e consumo protegido contra duplicidade |
| Cancelar ingresso | ingresso invalidado conforme regra |

## 9. Relatórios

Os relatórios devem ser consultas derivadas das fontes de verdade.

Principais consultas:
- vendas por período;
- vendas por unidade;
- vendas por produto;
- formas de pagamento;
- desempenho de caixa;
- estoque e movimentações;
- itens de maior giro;
- contas a receber;
- despesas;
- metas;
- eventos e ingressos.

## 10. Impressão

A impressão é uma saída do sistema, não a fonte da operação.

Operações que podem gerar impressão:
- venda;
- fechamento de comanda;
- fechamento de caixa;
- conta a receber;
- evento;
- ingresso;
- relatório.

## 11. Auditoria

Operações sensíveis devem produzir evento estruturado.

Exemplos:
- login/logout;
- alteração de permissão;
- alteração de preço;
- ajuste de estoque;
- fechamento de venda;
- estorno;
- abertura/fechamento de caixa;
- quitação de conta;
- validação de ingresso.

## 12. Transversalidade

Os casos de uso não devem chamar diretamente a UI de outro domínio.

Exemplo do fechamento de uma comanda:

comanda → venda → pagamento → caixa → estoque → contas a receber (quando fiado) → auditoria → impressão

O serviço orquestrador deve controlar essa sequência e a transação, quando aplicável.

## 13. Regras de consistência

1. Uma venda concluída não pode depender de um total calculado somente pelo navegador.
2. Uma baixa de estoque não deve ser repetida em um retry da mesma operação.
3. Um pagamento não deve aparecer no caixa sem estar associado a uma origem financeira.
4. Um ingresso utilizado não pode ser consumido duas vezes por corridas concorrentes.
5. Um usuário não pode operar uma unidade sem vínculo válido.
6. Um registro histórico não deve ser reescrito apenas porque o cadastro atual mudou.
7. Cancelamentos e estornos devem preservar a trilha da operação original.

## 14. Próxima etapa

Usar esta matriz como base para os contratos dos serviços de aplicação e para a revisão final das entidades antes do banco V3.