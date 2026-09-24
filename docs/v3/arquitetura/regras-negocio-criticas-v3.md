# Regras de negócio críticas — V3

Estas regras devem ser consideradas invariantes do sistema e, quando possível, protegidas também no banco.

## Identidade e acesso

1. Usuário inativo não executa operações.
2. Usuário só opera dentro de empresa/unidade autorizada.
3. A unidade escolhida no navegador nunca amplia autorização.
4. A permissão deve ser validada no caso de uso sensível.
5. O histórico deve identificar o ator da operação.

## Catálogo

6. Produto pertence a uma única empresa.
7. SKU/código de barras não pode gerar conflito dentro do escopo definido.
8. Preço usado em uma venda fica congelado no item da venda.
9. Alterar cadastro do produto não pode alterar vendas históricas.
10. Uma composição não pode criar ciclo sem regra explícita para isso.

## Estoque

11. O saldo oficial é o saldo do produto na unidade.
12. Toda alteração de saldo gera movimentação.
13. Movimentação deve possuir motivo/origem.
14. Operação repetida não pode duplicar uma baixa.
15. Inventário compara a contagem com o saldo efetivo protegido pelo servidor.
16. Transferência deve produzir saída da origem e entrada no destino como uma operação coerente.
17. Não permitir movimentação de produto de empresa diferente da unidade.

## Comandas e cozinha

18. Comanda pertence a uma unidade.
19. Item cancelado não desaparece do histórico.
20. Um lançamento de cozinha deve possuir identificação própria.
21. O mesmo item não pode ser produzido duas vezes por repetição acidental da mesma operação.
22. Status de cozinha não deve decidir sozinho se um item foi financeiramente cobrado; essa regra pertence ao fechamento da venda.

## Vendas

23. Total oficial da venda é calculado a partir dos itens e regras vigentes.
24. A venda finalizada deve possuir identidade de operação.
25. Retry da mesma operação não deve criar segunda venda.
26. Fechamento de comanda não deve depender de múltiplos updates independentes para formar um estado financeiro incoerente.
27. Desconto, taxa e alterações sensíveis precisam ficar registrados.

## Pagamentos e caixa

28. Todo pagamento deve possuir forma e valor válidos.
29. Pagamento vinculado a caixa deve apontar para uma sessão de caixa da mesma unidade.
30. Fechamento do caixa deve preservar os valores apurados e informados.
31. Recebimento parcial deve manter histórico dos recebimentos.
32. Não apagar uma transação financeira histórica quando um estorno for a operação correta.

## Contas a receber e despesas

33. Saldo de conta a receber é derivado do valor original e dos recebimentos.
34. Recebimento não pode ultrapassar o saldo permitido sem uma regra explícita de crédito.
35. Despesa deve possuir empresa e escopo de unidade quando aplicável.
36. Pagamentos de despesa devem permanecer rastreáveis.

## Eventos e ingressos

37. Ingresso possui código único.
38. Limite de quantidade não pode ser excedido por concorrência.
39. Um ingresso utilizado não pode ser consumido novamente.
40. Cada tentativa de validação importante deve possuir registro.
41. O fluxo público não recebe permissões administrativas.

## Auditoria

42. Operações críticas devem gerar auditoria.
43. Auditoria deve identificar contexto organizacional quando aplicável.
44. Auditoria de operação transacional não deve depender apenas do sucesso da UI.

## Invariantes financeiros adicionais

45. Uma venda e seus efeitos financeiros/estoque devem ser tratados como uma única operação quando a integridade exigir atomicidade.
46. Uma venda fiada não pode ficar sem a conta a receber obrigatória correspondente.
47. Um pagamento não pode ser associado a caixa de outra unidade.
48. Uma sessão de caixa não pode receber lançamentos depois de encerrada.
49. Encerramento local de turno não altera o estado financeiro do caixa.
50. Um estorno não deve apagar a operação original; deve gerar efeitos compensatórios identificáveis.
51. Recebimentos de contas a receber devem possuir histórico próprio e não depender somente de um valor acumulado mutável.
52. Pagamentos de despesas devem possuir histórico próprio e não depender somente de um campo pago/não pago.
53. Operações financeiras repetidas com a mesma operaçãoId não podem criar duplicidade.
54. O valor efetivamente incorporado ao caixa deve considerar troco quando houver pagamento em dinheiro.
55. Relatórios financeiros devem derivar seus números das fontes de verdade normalizadas, e não de campos duplicados mantidos para conveniência da UI.

## Regra de implementação

Quanto mais crítica a regra, mais próxima do núcleo transacional ela deve ficar.

UI pode validar para melhorar a experiência, mas serviço/backend/banco deve validar novamente.
