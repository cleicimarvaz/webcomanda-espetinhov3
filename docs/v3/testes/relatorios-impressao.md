# Testes futuros — Relatórios + Impressão V3

Estes testes serão executados somente após o banco V3 final estar criado e protegido.

## 1. Relatórios financeiros

- conferir venda finalizada no relatório de vendas;
- conferir pagamento dividido;
- conferir estorno sem apagar a venda original;
- conferir recebimento de conta a receber;
- conferir pagamento parcial de despesa;
- conferir escopo por empresa/unidade.

## 2. Datas

- venda concluída no limite inicial do período;
- venda concluída no limite final;
- pagamento em data diferente da venda;
- fechamento de caixa em outro horário;
- relatório usando a data correta do fato.

## 3. DRE

- receita;
- custo congelado do item;
- despesas;
- estorno;
- período sem movimentações.

O resultado deve ser reproduzível por uma mesma fonte de dados.

## 4. Estoque

- relatório de uma unidade;
- relatório consolidado permitido;
- movimentação de entrada;
- saída;
- inventário;
- transferência;
- alteração de produto não reescreve histórico.

## 5. Eventos e ingressos

- reservas;
- ingressos emitidos;
- cancelados;
- utilizados;
- receita por fonte financeira;
- múltiplas unidades quando permitido.

## 6. Exportações

Comparar:

- tela;
- PDF;
- Excel/CSV.

Os totais e linhas devem representar o mesmo conjunto de dados.

## 7. Impressão concluída

- venda concluída e impressão concluída;
- ingresso emitido e impressão concluída;
- relatório renderizado;
- ticket em 58 mm;
- ticket em 80 mm.

## 8. Falha de impressão

Simular:

- navegador indisponível;
- impressora indisponível;
- erro no adaptador;
- timeout.

Resultado esperado: operação original continua registrada e a impressão fica pendente/falha para reprocessamento.

## 9. Reimpressão

Reimprimir o mesmo documento várias vezes.

Resultado esperado:

- nenhuma nova venda;
- nenhum novo pagamento;
- nenhum novo ingresso;
- nenhuma nova movimentação financeira.

## 10. Retry

Reenviar o mesmo comando de impressão com a mesma identidade de operação.

Resultado esperado: tratamento idempotente do comando, sem confundi-lo com reimpressão deliberada.

## 11. Autorização

Testar usuário com acesso a:

- própria unidade;
- outra unidade;
- escopo corporativo;
- sem permissão para relatório financeiro;
- sem permissão administrativa.

## 12. Performance

Executar relatório com volume elevado e verificar:

- filtros;
- paginação;
- agregação;
- tempo de resposta;
- ausência de processamento integral desnecessário no navegador.

## 13. Regra de execução

Nenhum teste deste documento deve ser usado para alterar ou testar a V2 de produção.
