# Decisões de negócio ainda abertas para a V3

Este documento separa o que já foi identificado no código e banco daquilo que ainda depende de definição do negócio. Nenhuma das propostas abaixo deve ser tratada como decisão definitiva sem validação.

## 1. Preço por unidade

### Situação atual

produtos.preco possui um único preço por produto. O frontend ordena e vende diretamente usando esse campo.

### Questão

Todas as unidades de uma mesma empresa terão o mesmo preço?

### Modelos possíveis

**Modelo A — preço empresarial único**

produto → preço

**Modelo B — preço por unidade**

produto → preço por unidade

**Modelo C — preço padrão + preço por unidade**

Um preço padrão empresarial pode ser sobrescrito por unidade.

### Impacto

Essa decisão afeta produtos, histórico de preços, vendas, cardápio público, relatórios e combos.

---

## 2. Clientes

### Situação atual

O cadastro de cliente usa telefone como identificação prática e é compartilhado pelo sistema.

### Proposta para validação

Manter cliente no escopo da empresa e registrar em cada operação a unidade onde o relacionamento comercial aconteceu.

---

## 3. Fornecedores

### Situação atual

O cadastro de fornecedores é tratado como compartilhado e produtos podem referenciá-los.

### Proposta para validação

Manter fornecedor no escopo da empresa, permitindo uso pelas unidades.

---

## 4. Despesas corporativas

### Questão

Existirão despesas que pertencem à empresa como um todo, sem pertencer a uma unidade específica?

### Modelo sugerido

empresa_id obrigatório + unidade_id opcional.

Essa é uma proposta técnica, não uma decisão funcional definitiva.

---

## 5. Metas de faturamento

### Questão

Uma empresa com várias unidades terá:

- uma meta consolidada;
- uma meta por unidade;
- ou ambas?

Modelo flexível sugerido:

empresa_id obrigatório + unidade_id opcional + ano + mes.

---

## 6. Eventos

### Questão

Um evento estará sempre associado a uma unidade física ou poderá ser apenas da empresa?

Modelo sugerido:

empresa_id obrigatório + unidade_id opcional.

---

## 7. Configurações

A configuração precisa possuir escopo explícito.

Possibilidades:

- global;
- empresa;
- unidade;
- usuário;
- dispositivo.

A definição deve ser feita propriedade por propriedade.

---

## 8. Estoque

A direção arquitetural está fechada:

produto + unidade → saldo

O saldo oficial será por unidade e não ficará mais em produtos.estoque_atual como fonte de verdade.

---

## 9. Estratégia de estoque para combos

Definir qual estratégia será usada:

- combo sem estoque próprio, baixando componentes;
- combo como produto pronto, baixando o próprio combo;
- estratégia configurável por produto.

---

## 10. Saldo negativo

Definir o comportamento definitivo:

- saldo negativo permitido;
- bloquear saída acima do saldo;
- permitir exceção administrativa;
- outra regra.

---

## 11. Quantidade fracionada

Definir se:

- todos os produtos podem usar decimal;
- somente alguns produtos permitem fracionamento;
- cada produto terá unidade de medida própria.

---

## 12. Combos dentro de combos

Definir se componentes podem ser outros combos.

Caso sejam permitidos, o serviço/banco deverá detectar ciclos e limitar a profundidade.

---

## 13. Transferência entre unidades

Fechar:

- quem pode transferir;
- se exige aprovação;
- se existe estado em trânsito;
- quando o destino recebe saldo;
- como cancelar.

---

## 14. Storage e imagens

Definir:

- arquivos públicos;
- arquivos privados;
- metadados;
- exclusão automática;
- política de órfãos;
- backup de arquivos.

---

## 15. SKU / código de barras

Definir:

- SKU obrigatório ou opcional;
- código de barras opcional ou obrigatório;
- um ou vários códigos por produto;
- unicidade empresarial;
- possibilidade de código específico por unidade.

---

## 16. Inventário

Definir:

- rascunho/conclusão;
- um ou vários inventários abertos;
- contagem por etapas;
- conjunto de produtos;
- aprovação para ajustes relevantes;
- comportamento diante de saldo alterado após a contagem.

A regra obrigatória é que o ajuste final utilize o saldo efetivo protegido no momento da conclusão.

---

## 17. Identificação da mesa/comanda

A V3 precisa definir se a identificação será:

- única enquanto estiver aberta na unidade;
- única também no histórico;
- reutilizável depois do fechamento.

---

## 18. Ciclo de vida da comanda

Definir os estados oficiais.

Modelo conceitual atual:

aberta → em_atendimento → pronta_para_fechamento → fechada

Estados complementares possíveis:

- cancelada;
- reaberta;
- encerrada administrativamente.

---

## 19. Reabertura de comanda

Definir:

- se reabre a mesma comanda;
- se cria uma nova sessão de atendimento dentro da mesma comanda;
- se exige autorização especial;
- se existe limite de reaberturas.

---

## 20. Cancelamento e recusa de item

Quando um item for recusado pela cozinha, definir:

- cancelamento automático da cobrança;
- confirmação pelo atendimento;
- substituição;
- cancelamento parcial.

Também definir quais alterações são permitidas depois do envio para cozinha.

---

## 21. Divisão da conta

Definir:

- pagamento por valor;
- pagamento por itens;
- divisão de quantidade de uma linha;
- múltiplas formas de pagamento;
- troco por participante;
- fechamento parcial;
- fechamento total.

A estrutura técnica já está preparada para representar pagamentos de forma explícita.

---

## 22. Permissões do atendimento

Definir quais papéis podem:

- abrir comanda;
- alterar item;
- cancelar item;
- dividir;
- reabrir;
- fechar;
- estornar;
- aplicar desconto;
- encerrar comandas em massa.

---

## 23. Venda balcão e caixa

### Questão

Uma venda balcão pode existir sem caixa aberto?

Também definir a política para:

- venda em contingência;
- pagamento sem caixa;
- fiado;
- registro posterior.

---

## 24. Formas de pagamento

Definir a lista oficial de formas de pagamento e quais delas exigem vínculo com caixa.

Exemplos de representação:

- Dinheiro;
- Pix;
- Cartão;
- Fiado;
- outras formas necessárias.

---

## 25. Pagamento dividido

Definir se múltiplas formas de pagamento serão permitidas na primeira entrega.

A arquitetura V3 já prevê vários registros em venda_pagamentos.

---

## 26. Conta a receber

Definir:

- se cliente cadastrado é obrigatório para fiado;
- se recebimento acima do saldo pode virar crédito;
- se uma conta pode ser recebida em unidades diferentes;
- quais papéis podem lançar, editar e receber.

---

## 27. Despesas

Definir:

- se pagamento parcial é permitido;
- se despesa pode ser alterada depois de paga;
- quando uma despesa deve ser cancelada em vez de excluída;
- quais despesas podem ser corporativas.

---

## 28. Estorno

Definir:

- estorno total;
- estorno parcial;
- autorização adicional;
- devolução automática de estoque;
- reversão automática de conta a receber;
- comportamento do caixa;
- prazo ou janela para estorno.

---

## 29. Fechamento de caixa

Definir:

- quantidade de caixas abertos simultaneamente por unidade;
- se toda unidade terá um único caixa operacional;
- se exige contagem física;
- se diferença exige justificativa;
- quem pode fechar;
- se pode reabrir um caixa fechado;
- se haverá conferência por segundo usuário.

---

## 30. Pagamentos não monetários e caixa

Definir se Pix, cartão e outras formas devem sempre estar vinculados a uma sessão de caixa mesmo quando não representam numerário físico.

A definição interfere diretamente nos relatórios, conciliação e permissões.

---

## 31. Encerramento de turno x fechamento do caixa

A V3 deve manter os conceitos separados:

- encerramento local do turno = remove o contexto daquele dispositivo;
- fechamento do caixa = encerra a sessão operacional da unidade.

O comportamento atual do navegador não deve ser tratado como fechamento real do caixa.

---

## 32. Conciliação do caixa

Definir se o fechamento exibirá e registrará:

- valor inicial;
- entradas;
- saídas;
- valor esperado;
- valor contado;
- diferença;
- justificativa.

A direção técnica é manter a diferença como dado histórico.

---

## 33. Estorno de venda fiada

Definir o comportamento quando já houver recebimentos da conta a receber:

- cancelar saldo restante;
- gerar crédito;
- reverter recebimentos;
- tratar conforme regra administrativa.

---

## 34. Atendimento simultâneo

Definir como a operação deseja tratar dois usuários na mesma comanda ao mesmo tempo e quais ações podem ocorrer em paralelo.

A arquitetura técnica exige que conflitos críticos sejam resolvidos no serviço/banco.

---

## Matriz de decisão

| Tema | Direção técnica | Decisão funcional necessária? |
|---|---|---|
| Preço | empresa, unidade ou padrão + sobrescrita | Sim |
| Cliente | empresa | Não necessariamente |
| Fornecedor | empresa | Não necessariamente |
| Despesa | empresa + unidade opcional | Sim |
| Meta | empresa + unidade opcional | Sim |
| Evento | empresa + unidade opcional | Sim |
| Configuração | escopo explícito | Sim |
| Estoque | produto + unidade | Não |
| Combo | estratégia explícita | Sim |
| Saldo negativo | regra no serviço/banco | Sim |
| Quantidade decimal | regra por produto | Sim |
| Combo dentro de combo | bloqueio ou proteção contra ciclo | Sim |
| Transferência | operação transacional | Sim |
| Storage | política de arquivos | Sim |
| SKU | escopo e unicidade | Sim |
| Inventário | ciclo e concorrência | Sim |
| Mesa/comanda | unicidade de identificação | Sim |
| Reabertura | histórico explícito | Sim |
| Cancelamento | evento de domínio + regra financeira | Sim |
| Divisão | partes + pagamentos | Sim |
| Permissões | código de permissão | Sim |
| Caixa | sessão por unidade | Sim |
| Formas de pagamento | catálogo oficial | Sim |
| Pagamento dividido | venda_pagamentos | Sim |
| Contas a receber | ledger + recebimentos | Sim |
| Despesas | obrigação + pagamentos | Sim |
| Estorno | operação compensatória | Sim |
| Fechamento de caixa | sessão real + conciliação | Sim |
| Turno local | apenas contexto de dispositivo | Não |
| Concorrência | serviço/banco | Não para a direção técnica |

## Regra antes da migration

Nenhuma decisão funcional deve ser codificada como regra permanente antes de ser validada.

O banco V3 será criado somente depois que as revisões de todos os domínios estiverem concluídas e as decisões necessárias estiverem consolidadas.
