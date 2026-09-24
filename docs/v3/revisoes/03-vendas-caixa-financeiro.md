# Revisão V3 — Vendas + Caixa + Financeiro

## Objetivo

Esta revisão confronta os fluxos atuais de venda, fechamento de comanda, caixa, contas a receber, despesas e estorno com a arquitetura V3.

O foco é definir a fonte de verdade financeira e identificar quais operações precisam ser atômicas antes da consolidação do banco físico.

O banco V3 definitivo continua fora desta etapa.

---

## 1. Situação atual

A V2 distribui uma mesma operação financeira entre vários módulos e chamadas independentes ao Supabase.

### Venda balcão

Hoje o fluxo:

1. calcula o total no navegador;
2. grava em historico_vendas;
3. quando é fiado, grava contas_receber;
4. baixa estoque em outra operação;
5. registra auditoria;
6. dispara impressão.

### Fechamento de comanda

O fluxo é semelhante:

1. lê a comanda;
2. recalcula o total no navegador;
3. grava historico_vendas;
4. tenta criar a conta a receber;
5. fecha a comanda;
6. solicita a baixa de estoque;
7. registra auditoria;
8. oferece impressão.

### Caixa

O caixa atual é tratado como uma sessão única global e o navegador guarda o ID do caixa em localStorage.

### Contas a receber

O cadastro utiliza valor e valor_pago diretamente na conta.

### Despesas

A situação de pagamento é mantida diretamente em despesas.paga.

### Estorno

O estorno atual altera o status da operação, com autorização separada, mas não executa de forma centralizada as reversões de caixa, estoque e contas a receber.

---

## 2. Fonte de verdade da venda

A V3 deve substituir historico_vendas como entidade central por:

- vendas;
- venda_itens;
- venda_pagamentos.

### Regra

vendas representa a operação comercial.

venda_itens representa os itens efetivamente vendidos e seus preços praticados.

venda_pagamentos representa o dinheiro recebido ou o crédito gerado.

O catálogo atual não deve ser usado para reconstruir uma venda antiga.

---

## 3. Total da venda

O legado calcula o total diretamente no navegador e grava o resultado.

Na V3 o navegador pode calcular para exibição, mas o valor oficial deve ser recalculado pelo serviço/backend.

O serviço deve validar:

- produto;
- quantidade;
- preço aplicável;
- desconto;
- taxa;
- complementos;
- total final;
- forma de pagamento.

O total enviado pela UI é uma informação de entrada, não uma autoridade.

---

## 4. Preço praticado

A venda precisa congelar:

- produto;
- descrição/nome relevante;
- quantidade;
- preço unitário;
- descontos;
- total da linha;
- complementos cobrados.

Isso impede que uma alteração futura no catálogo mude uma venda histórica.

---

## 5. Idempotência da venda

Cada operação de venda deve possuir operacaoId.

Retry da mesma operação deve retornar o resultado já criado.

Não deve ser possível gerar:

- duas vendas;
- dois pagamentos;
- duas baixas;
- dois lançamentos financeiros

porque um dispositivo repetiu uma requisição após timeout.

A idempotência precisa ser aplicada no fechamento financeiro como um todo, e não apenas em uma baixa de estoque isolada.

---

## 6. Venda balcão e fechamento de comanda

Os dois fluxos têm regras diferentes na interface, mas não devem possuir duas implementações financeiras independentes.

### Direção V3

Criar uma base comum de fechamento comercial.

Exemplo conceitual:

finalizarVenda({ origem: 'balcao' | 'comanda', ... })

O serviço trata de:

- cálculo;
- validações;
- pagamentos;
- estoque;
- fiado;
- auditoria;
- estado da comanda quando houver.

Isso evita divergências entre venda balcão e fechamento de mesa.

---

## 7. Caixa como sessão operacional

A V3 deve tratar caixa como uma sessão da unidade.

Relacionamento:

unidade → caixas

Cada caixa deve possuir:

- abertura;
- responsável;
- valor inicial;
- status;
- fechamento;
- valor esperado;
- valor informado;
- diferença;
- conferência.

A V2 atual usa uma consulta que pressupõe um único caixa aberto em todo o sistema. Isso não é compatível com múltiplas unidades.

---

## 8. Uma sessão de caixa por unidade

A regra técnica recomendada é que exista, no máximo, uma sessão aberta por unidade quando essa for a operação escolhida.

Essa restrição deve ser protegida pelo banco para impedir duas aberturas concorrentes.

O navegador não pode ser a autoridade dessa exclusividade.

---

## 9. localStorage não é fonte de verdade do caixa

O idCaixaAtual pode continuar existindo temporariamente como cache de interface, mas nunca deve definir qual caixa pertence ao usuário.

O serviço deve obter o contexto real:

- usuário;
- empresa;
- unidade;
- caixa.

Ao mudar de dispositivo, o operador deve conseguir continuar a operação sem depender de dados gravados no navegador anterior.

---

## 10. Suprimento e sangria

A V2 já possui suprimento e sangria com:

- caixa;
- valor;
- motivo;
- usuário.

Na V3 essas operações passam para movimentacoes_caixa.

Regras:

- caixa deve estar aberto;
- caixa pertence à unidade atual;
- valor deve ser positivo;
- tipo deve ser controlado;
- operação deve ser auditável;
- retry não deve duplicar a movimentação.

---

## 11. Pagamentos e caixa

O pagamento não deve ser criado como texto solto em uma movimentação de caixa.

Exemplo:

venda → venda_pagamento → caixa

Assim é possível saber:

- qual venda gerou o pagamento;
- qual forma foi usada;
- qual valor;
- qual caixa recebeu;
- qual usuário registrou;
- quando ocorreu.

Para outras origens:

conta_receber → recebimento → caixa

despesa → pagamento → caixa

A movimentação financeira deve preservar a origem.

---

## 12. Pagamento dividido

O modelo V3 já prevê vários registros em venda_pagamentos.

Isso permite:

- Pix + dinheiro;
- dinheiro + cartão;
- outros arranjos autorizados.

A divisão de conta do atendimento deve produzir pagamentos reais, e não apenas várias linhas artificiais em historico_vendas.

A regra de múltiplas formas de pagamento continua sendo uma decisão funcional a fechar.

---

## 13. Dinheiro recebido e troco

Para pagamento em dinheiro devem ser registrados, quando necessários:

- valor da venda;
- valor recebido;
- troco.

O caixa deve considerar o valor efetivamente incorporado ao caixa, e não o valor entregue pelo cliente quando houver troco.

---

## 14. Contas a receber

O modelo atual usa valor_pago como campo mutável.

Isso não é suficiente para um histórico financeiro completo.

### Direção V3

Usar:

contas_receber

+

contas_receber_pagamentos

O saldo deve ser derivado:

valor_original - soma(recebimentos válidos)

Cada recebimento deve registrar:

- valor;
- forma;
- usuário;
- caixa;
- data;
- operação;
- observação.

---

## 15. Fechamento de conta a receber

Receber uma conta deve ser uma operação financeira.

O serviço deve impedir:

- recebimento zero/negativo;
- valor acima do saldo permitido;
- recebimento em caixa de outra unidade;
- dupla gravação em retry.

O estado aberto/parcial/pago deve ser derivado ou mantido pelo serviço de forma consistente com os recebimentos.

---

## 16. Problema atual do fiado

Hoje a venda é gravada e a conta a receber é criada em uma chamada posterior.

Em caso de falha pode existir:

venda registrada + conta a receber ausente

Na V3, quando a venda for fiado:

venda + conta a receber

devem ser criadas na mesma operação transacional.

Se um cliente identificado for obrigatório para o fiado, essa validação precisa ocorrer antes da gravação.

---

## 17. Cliente e crédito

O cadastro de cliente pertence à empresa.

A conta a receber deve possuir:

- cliente;
- empresa;
- unidade de origem;
- venda de origem.

O limite de crédito, quando existir, não deve ser usado como substituto do saldo devedor.

O saldo devedor deve vir do ledger de contas a receber.

---

## 18. Despesas

O legado mantém uma coluna paga na própria despesa.

Na V3:

despesas

+

despesa_pagamentos

devem representar a obrigação e seus pagamentos.

Isso permite:

- pagamento parcial;
- pagamento total;
- mais de uma baixa;
- histórico;
- estorno.

---

## 19. Pagamento de despesa e caixa

Quando uma despesa for paga por um caixa da unidade, o pagamento deve apontar para a sessão de caixa correspondente.

Quando a despesa for corporativa, a origem financeira pode ficar fora de uma unidade operacional, conforme decisão de negócio.

O mesmo pagamento não deve ser lançado simultaneamente em dois caixas.

---

## 20. Exclusão de registros financeiros

Hoje existem ações de exclusão de contas a receber e despesas.

Na V3, registros financeiros que já tiveram efeito devem ser preservados.

A regra normal passa a ser:

- cancelar;
- estornar;
- corrigir por operação compensatória.

Exclusão física deve ficar restrita a registros ainda sem efeitos financeiros e a casos administrativos controlados.

---

## 21. Estorno

Este é um dos pontos mais importantes da revisão.

No legado, o estorno altera o status da venda.

Isso é insuficiente para uma operação integrada.

### Direção V3

O estorno deve ser uma operação compensatória ligada à venda original.

Deve poder gerar, conforme a origem:

- reversão do pagamento;
- ajuste do caixa;
- retorno do estoque;
- reversão da conta a receber;
- auditoria.

A venda original permanece preservada.

---

## 22. Estorno de venda fiada

Se uma venda gerou uma conta a receber, o estorno precisa considerar também essa obrigação.

Não deve existir:

venda estornada + dívida do cliente mantida por engano

nem:

venda ativa + recebimento estornado

sem uma regra explícita.

O serviço financeiro deve orquestrar os efeitos relacionados.

---

## 23. Autorização de estorno

O legado pede usuário e senha de administrador diretamente na tela.

Na V3 isso não deve permanecer como mecanismo principal.

A autorização deve ser baseada na sessão autenticada e em permissão específica, por exemplo:

vendas.estornar

Quando houver exigência de elevação de privilégio, isso deverá ser um fluxo controlado de autorização, não uma consulta da senha armazenada pela aplicação.

---

## 24. Fechamento de caixa

A V3 deve separar:

encerrar turno local

de

fechar sessão de caixa.

O recurso atual que remove o ID do caixa do localStorage apenas encerra a relação local do dispositivo.

Ele não deve ser confundido com o fechamento contábil/operacional do caixa.

O fechamento real deve:

1. identificar a sessão;
2. bloquear novos lançamentos;
3. calcular o valor esperado;
4. receber o valor contado;
5. registrar diferença;
6. registrar responsável e horário;
7. finalizar a sessão.

---

## 25. Conciliação

O caixa deve permitir comparar:

valor inicial + entradas - saídas

com

valor contado

e guardar a diferença.

O valor esperado deve ser derivado das fontes financeiras, não de um total digitado manualmente.

---

## 26. Integridade de unidade

Todas as relações financeiras precisam respeitar o contexto organizacional.

Exemplos:

- venda e caixa pertencem à mesma unidade;
- recebimento e caixa pertencem à mesma unidade, quando aplicável;
- pagamento de despesa e caixa pertencem à mesma unidade, quando aplicável;
- conta a receber registra a unidade de origem;
- usuário precisa possuir vínculo válido.

---

## 27. Auditoria financeira

Operações relevantes devem registrar:

- ator;
- empresa;
- unidade;
- operação;
- entidade;
- valores anteriores e novos, quando aplicável;
- origem;
- sucesso/erro.

Operações críticas não devem depender de registrarLog() executado depois pela interface.

A auditoria importante deve fazer parte do núcleo transacional.

---

## 28. Relatórios

Relatórios financeiros devem consultar as fontes normalizadas:

- vendas;
- itens;
- pagamentos;
- caixas;
- movimentações;
- contas a receber;
- recebimentos;
- despesas;
- pagamentos de despesas;
- estornos.

Não devem depender de somas frágeis de campos duplicados.

---

## 29. Decisões técnicas fechadas nesta revisão

| Tema | Direção V3 |
|---|---|
| Venda | vendas + venda_itens + venda_pagamentos |
| Total | recalculado pelo serviço/backend |
| Preço histórico | congelado no item da venda |
| Idempotência | por operação financeira, não só estoque |
| Venda balcão/comanda | regras financeiras compartilhadas |
| Caixa | sessão por unidade |
| Caixa no navegador | apenas cache/contexto local |
| Exclusividade do caixa | protegida no banco |
| Pagamento | entidade própria com origem |
| Contas a receber | ledger + recebimentos |
| Despesas | obrigação + pagamentos |
| Exclusão financeira | evitar após efeito |
| Estorno | operação compensatória |
| Autorização | permissão/sessão, não senha consultada no banco |
| Fechamento de caixa | operação real separada do encerramento local |
| Conciliação | esperado × contado × diferença |
| Auditoria | parte do núcleo transacional |

---

## 30. Decisões funcionais que continuam abertas

1. uma unidade pode ter mais de um caixa aberto ao mesmo tempo?
2. venda balcão exige caixa aberto?
3. pagamentos Pix/cartão precisam sempre estar associados a uma sessão de caixa?
4. pagamento dividido será permitido na primeira entrega?
5. quais formas de pagamento existirão oficialmente?
6. conta a receber aceita pagamento acima do saldo como crédito?
7. despesa pode ser paga parcialmente?
8. despesa corporativa existirá?
9. estorno total e parcial serão suportados?
10. estorno exige segunda autorização além da permissão?
11. o estorno devolve automaticamente o estoque?
12. venda fiada exige cliente cadastrado?
13. uma mesma conta a receber pode ter recebimentos em unidades diferentes?
14. fechamento de caixa exige contagem física obrigatória?
15. diferença de caixa exige justificativa?
16. pode haver caixa sem operador específico, ou todo caixa terá responsável?

---

## 31. Conclusão

A revisão mostra que o principal trabalho da V3 não é apenas normalizar tabelas.

É criar uma cadeia financeira coerente:

Venda → Pagamento → Caixa

Venda fiada → Conta a receber → Recebimento → Caixa

Despesa → Pagamento → Caixa

Estorno → operações compensatórias

Essa estrutura elimina grande parte dos estados intermediários existentes no legado e deixa o histórico financeiro reconstruível.

O próximo passo deve revisar Eventos + Ingressos, mantendo a mesma preocupação com concorrência, limites, pagamentos, reservas, mesas e validação de ingresso.

O banco físico definitivo continua para a etapa final, depois da revisão de todos os domínios.
