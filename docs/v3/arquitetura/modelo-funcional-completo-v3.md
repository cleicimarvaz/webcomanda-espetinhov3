# Modelo funcional e de dados — V3

## Objetivo

Este documento fecha a visão conceitual dos principais dados da V3 antes da criação física do banco.

**Importante:** isto é uma modelagem de referência. As tabelas e campos somente serão consolidados em SQL depois que os módulos e regras forem revisados em conjunto.

A sequência adotada é:

funcionalidades → regras → entidades → relacionamentos → serviços → modelo físico → banco

---

## 1. Organização e identidade

### Empresa
Representa uma organização cliente do SaaS.

Relações principais:
- uma empresa possui várias unidades;
- uma empresa possui vários usuários vinculados;
- uma empresa possui catálogo, clientes, fornecedores e configurações próprias;
- uma empresa pode possuir eventos corporativos.

### Unidade
Representa um estabelecimento/filial/local operacional.

Relações principais:
- pertence a uma empresa;
- possui usuários vinculados diretamente ou por escopo empresarial;
- possui estoque próprio;
- possui caixas;
- possui comandas e vendas;
- pode possuir despesas, metas e eventos próprios.

### Usuário
Representa a identidade de aplicação do operador.

A autenticação deve ficar no provedor de autenticação. O cadastro de aplicação deve armazenar perfil e preferências, sem senha.

### Membro da organização
Relaciona usuário, empresa, unidade e papel.

Um vínculo com unidade_id = NULL representa escopo empresarial.

### Papel / Permissão
Papéis agrupam permissões.

Exemplos de permissões:
- sistema.configurar
- usuarios.gerenciar
- produtos.gerenciar
- estoque.visualizar
- estoque.movimentar
- estoque.inventariar
- vendas.operar
- comandas.operar
- caixa.operar
- financeiro.operar
- eventos.gerenciar
- ingressos.emitir
- ingressos.validar
- auditoria.visualizar

A lista definitiva deve ser derivada dos casos de uso da V3.

## 2. Catálogo

### Categoria de produto
A V2 usa categoria como texto livre. Para a V3 é recomendável uma entidade própria para evitar divergências de grafia e permitir ordenação, ativação e configuração.

categoria_produto

Relação:
empresa 1:N categoria_produto

### Produto
Representa um item comercial do catálogo.

Dados conceituais:
- identificação;
- nome;
- categoria;
- descrição;
- observação;
- preço;
- custo;
- SKU/código de barras;
- imagem;
- status;
- controla estoque;
- estoque mínimo;
- precisa de preparo;
- aceita complementos.

O produto pertence à empresa.

### Preço do produto
Para não bloquear a decisão de preço futuro, o modelo deve suportar:
- preço padrão da empresa;
- substituição de preço por unidade.

Entidade candidata:
produto_precos

Campos conceituais:
- produto;
- unidade opcional;
- preço;
- vigência;
- ativo.

A ausência de unidade representa preço empresarial padrão.

### Histórico de preços
Registra as alterações efetivas de preço.

Deve guardar:
- produto;
- unidade quando aplicável;
- preço anterior;
- preço novo;
- usuário;
- data;
- origem da alteração.

### Composição de produto
Representa combos e produtos compostos.

produto_composicao

Relações:
produto (combo) 1:N produto_composicao N:1 produto (componente)

A composição deve suportar quantidade e, futuramente, regras de estoque derivado.

### Complementos
Representam opções que podem ser adicionadas ao pedido.

A V3 deve separar:
- cadastro da opção;
- tipo/grupo do complemento;
- quais produtos aceitam o complemento;
- seleção feita no item da venda.

Entidades candidatas:
- grupos_complemento
- complementos
- produto_complementos

A seleção do complemento deve permanecer ligada ao item da venda/comanda, e não apenas ao produto.

## 3. Estoque

O estoque é sempre contextualizado pela unidade.

### Saldo de estoque
estoque_produto_unidade

Chave lógica:
produto + unidade

Fonte oficial do saldo.

### Movimentação de estoque
Registra cada entrada, saída ou ajuste.

Deve conter:
- empresa;
- unidade;
- produto;
- tipo;
- quantidade;
- saldo anterior;
- saldo novo;
- motivo;
- usuário;
- origem;
- operação;
- inventário, quando aplicável;
- data.

### Inventário
Representa uma contagem física.

Recomendação para a V3:
inventarios + inventario_itens

Cada item deve guardar:
- produto;
- saldo no momento da contagem;
- contagem física;
- diferença;
- ajuste gerado.

Isso evita guardar a contagem apenas em JSONB.

### Transferência de estoque
Para suportar múltiplas unidades, é recomendável prever uma entidade própria antes de fechar o modelo físico:

transferencias_estoque
transferencia_itens

Ela representaria:
unidade origem → unidade destino

e geraria movimentações vinculadas à mesma operação.

O recurso pode ficar desativado na primeira entrega, mas o modelo não deve impedir sua implementação.

## 4. Atendimento e comandas

A V2 concentra muitos dados da comanda em JSONB. Para a V3, a direção é estruturar os registros operacionais.

### Comanda
Representa a sessão de atendimento.

Dados:
- unidade;
- identificação da mesa/comanda;
- status;
- usuário responsável;
- abertura;
- fechamento;
- total calculado;
- eventual estorno/cancelamento.

### Item da comanda
comanda_itens

Cada item representa uma linha adicionada à comanda.

Dados:
- comanda;
- produto;
- quantidade;
- preço unitário praticado;
- observação;
- complementos;
- status de preparo;
- quantidade enviada à cozinha;
- horários de inclusão/alteração/cancelamento.

### Pedido / lançamento para cozinha
Para preservar o histórico de cada envio, é recomendável separar o conceito de lançamento:

pedidos
pedido_itens

Um pedido representa um lote enviado para produção/cozinha.

Isso permite:
- vários lançamentos na mesma comanda;
- controle de fila;
- status de preparo;
- tempo de produção;
- reenvio;
- cancelamento de um lançamento sem apagar o histórico da comanda.

A comanda continua sendo o agregado comercial; o pedido representa a execução operacional.

## 5. Vendas

### Venda
Representa a operação comercial finalizada.

Dados:
- empresa;
- unidade;
- usuário;
- comanda opcional;
- caixa opcional;
- cliente opcional;
- subtotal;
- desconto;
- taxa de serviço;
- total;
- status;
- origem;
- operação/idempotência;
- datas.

### Item da venda
venda_itens

Deve preservar o preço praticado no momento da venda.

Não deve depender do preço atual do produto para reconstruir uma venda antiga.

Campos conceituais:
- venda;
- produto;
- quantidade;
- preço unitário;
- desconto;
- total da linha;
- observação;
- snapshot relevante do nome/produto quando necessário.

### Complementos da venda
Quando houver complementos, a seleção deve ser preservada na venda.

Pode ser uma tabela própria:
venda_item_complementos

Assim, alterações futuras no cadastro do complemento não alteram o histórico da venda.

### Pagamentos
Mesmo que inicialmente exista apenas um método por venda, o modelo deve suportar:

venda_pagamentos

Isso permite futuramente:
- pagamento dividido;
- mais de uma forma de pagamento;
- conciliação;
- estornos parciais.

## 6. Caixa

### Caixa
Representa uma sessão de caixa da unidade.

Dados:
- unidade;
- usuário responsável pela abertura;
- usuário responsável pelo fechamento;
- horário;
- valor inicial;
- valor final;
- status;
- conferência.

### Movimentação de caixa
movimentacoes_caixa

Tipos principais:
- suprimento;
- sangria;
- ajuste;
- outros tipos justificados.

As vendas e recebimentos não devem depender apenas de texto em movimentação; devem possuir relações com suas fontes financeiras.

## 7. Contas a receber

### Conta a receber
Representa um débito de cliente.

Dados:
- empresa;
- unidade de origem;
- cliente;
- venda de origem, quando existir;
- descrição;
- valor original;
- vencimento;
- status;
- datas.

### Recebimento de conta
Em vez de manter somente valor_pago, a V3 deve permitir:

contas_receber_pagamentos

Cada recebimento contém:
- conta;
- valor;
- forma de pagamento;
- usuário;
- caixa;
- data;
- observação.

O saldo da conta passa a ser:
valor original - soma dos recebimentos

Isso permite pagamentos parciais e histórico completo.

## 8. Despesas

### Despesa
Representa uma obrigação financeira.

Dados:
- empresa;
- unidade opcional;
- fornecedor opcional;
- descrição;
- categoria;
- valor;
- vencimento;
- status.

### Pagamentos de despesa
Para não perder histórico, prever:

despesa_pagamentos

Permite registrar:
- valor pago;
- data;
- forma de pagamento;
- caixa/conta financeira;
- usuário.

A despesa pode ser corporativa quando não houver unidade.

## 9. Metas

### Meta de faturamento
Modelo deve suportar:
- meta da empresa;
- meta da unidade.

Estrutura conceitual:
empresa + unidade opcional + período

Uma mesma empresa pode ter uma meta consolidada e metas individuais das unidades.

## 10. Eventos

### Evento
Representa um evento promovido pela empresa.

Pode possuir:
- escopo empresarial;
- unidade física;
- data;
- capacidade;
- mesas;
- dados de comunicação;
- status.

### Mesas do evento
A V2 guarda mesas em JSONB. Para a V3 é recomendável prever:

evento_mesas

Cada mesa possui:
- evento;
- número;
- capacidade;
- posição no mapa;
- status.

Isso permite controle de disponibilidade sem depender de um JSON.

### Reserva de evento
reservas_evento
Representa a reserva comercial.

### Mesas da reserva
reserva_mesas
Relaciona uma reserva às mesas reservadas.

### Patrocinadores
Em vez de guardar patrocinadores em JSONB no evento, prever:

patrocinadores
evento_patrocinadores

Isso permite cadastro reutilizável e histórico.

## 11. Ingressos

### Tipo de ingresso
Pertence ao evento.

Dados:
- nome;
- preço;
- limite;
- período de venda;
- ativo.

### Ingresso
Representa a unidade individual vendida.

Dados:
- evento;
- tipo;
- código único;
- comprador;
- canal;
- valor;
- status;
- venda;
- datas.

### Validação do ingresso
Prever:

validacoes_ingresso

Cada tentativa/validação registra:
- ingresso;
- resultado;
- usuário/dispositivo;
- data;
- motivo;
- origem.

Isso evita que a validação fique apenas registrada no status atual do ingresso.

## 12. Clientes

### Cliente
Cadastro compartilhado dentro da empresa.

Dados:
- nome;
- telefone;
- documentos, se necessário;
- limite de crédito;
- dados complementares.

A unidade da relação comercial deve ficar na venda/comanda/conta, e não obrigatoriamente no cadastro do cliente.

## 13. Fornecedores

### Fornecedor
Cadastro compartilhado pela empresa.

Dados:
- nome;
- documento;
- categoria;
- telefone;
- e-mail;
- endereço;
- observações;
- status.

Produtos e despesas podem referenciar fornecedores.

## 14. Auditoria

### Auditoria
Entidade transversal.

Toda operação relevante deve conseguir registrar:
- usuário;
- empresa;
- unidade;
- módulo;
- ação;
- entidade;
- entidade_id;
- antes;
- depois;
- origem;
- operação;
- sucesso/erro;
- data.

A auditoria não deve depender exclusivamente de chamadas feitas pela UI.

## 15. Configurações

A configuração precisa ter escopo explícito.

### Possíveis escopos
- global;
- empresa;
- unidade;
- usuário;
- dispositivo.

### Categorias
- dados da loja;
- funcionamento;
- catálogo;
- categorias;
- impressão;
- notificações;
- integrações;
- aparência;
- regras operacionais.

Nem toda configuração precisa ficar no banco. Preferências puramente locais podem permanecer no navegador.

## 16. Arquivos e Storage

A V3 deve separar conceitualmente:
- arquivo público de catálogo;
- arquivo público de evento;
- arquivo privado/documento;
- backup.

Metadados de arquivo podem ser associados à entidade de origem quando a necessidade aparecer no modelo funcional.

## 17. Relatórios

Relatórios não devem ser tratados como fonte de verdade.

Eles devem consultar:
- vendas;
- itens de venda;
- pagamentos;
- caixa;
- estoque;
- movimentações;
- despesas;
- contas a receber;
- eventos;
- ingressos.

Quando necessário, podem ser criadas views ou materializações específicas depois.

## 18. Relações principais

### Organização
empresa 1:N unidade
usuario N:N empresa/unidade via membros_organizacao
papel N:N permissao

### Catálogo
empresa 1:N categoria_produto
empresa 1:N produto
produto 1:N historico_preco
produto N:N produto via produto_composicao
produto N:N complemento via produto_complementos

### Estoque
unidade 1:N estoque_produto_unidade
produto 1:N estoque_produto_unidade
estoque_produto_unidade 1:N estoque_movimentacoes
inventario 1:N inventario_itens

### Atendimento
unidade 1:N comanda
comanda 1:N comanda_itens
comanda 1:N pedido
pedido 1:N pedido_itens

### Vendas
venda 1:N venda_itens
venda 1:N venda_pagamentos
venda_item 1:N venda_item_complementos
comanda 1:N venda quando uma comanda for fechada.

### Financeiro
caixa 1:N movimentacoes_caixa
conta_receber 1:N conta_receber_pagamentos
despesa 1:N despesa_pagamentos

### Eventos
evento 1:N evento_mesas
evento 1:N reservas_evento
reserva N:N evento_mesas via reserva_mesas
evento 1:N tipos_ingresso
evento 1:N ingressos
ingresso 1:N validacoes_ingresso
evento N:N patrocinador via evento_patrocinadores

## 19. Fontes de verdade

| Domínio | Fonte principal |
|---|---|
| Produto | produtos |
| Preço praticado | venda_itens |
| Saldo de estoque | estoque_produto_unidade |
| Histórico de estoque | estoque_movimentacoes |
| Comanda | comandas + comanda_itens |
| Cozinha | pedidos + pedido_itens |
| Venda | vendas + venda_itens + venda_pagamentos |
| Caixa | caixas + movimentacoes_caixa |
| Conta a receber | contas_receber + recebimentos |
| Despesa | despesas + pagamentos |
| Evento | eventos |
| Ingresso | ingressos + validações |
| Auditoria | auditoria |

## 20. Entidades propostas

### Núcleo
- empresas
- unidades
- usuarios
- membros_organizacao
- papeis
- permissoes
- papel_permissoes
- auditoria

### Catálogo
- categorias_produto
- produtos
- produto_precos
- historico_precos
- produto_composicao
- grupos_complemento
- complementos
- produto_complementos

### Estoque
- estoque_produto_unidade
- estoque_movimentacoes
- inventarios
- inventario_itens
- transferencias_estoque
- transferencia_itens

### Atendimento
- comandas
- comanda_itens
- pedidos
- pedido_itens

### Vendas
- vendas
- venda_itens
- venda_item_complementos
- venda_pagamentos

### Financeiro
- caixas
- movimentacoes_caixa
- contas_receber
- contas_receber_pagamentos
- despesas
- despesa_pagamentos
- metas_faturamento

### Eventos
- eventos
- evento_mesas
- reservas_evento
- reserva_mesas
- patrocinadores
- evento_patrocinadores
- tipos_ingresso
- ingressos
- validacoes_ingresso

### Configuração
- configuracoes_sistema

## 21. Pontos que ainda dependem de decisão

A modelagem foi construída para manter as alternativas abertas onde possível.

Ainda precisam ser fechados antes do SQL definitivo:
1. preço empresarial, preço por unidade ou ambos;
2. cliente compartilhado por empresa;
3. fornecedor compartilhado por empresa;
4. despesa corporativa;
5. meta consolidada e/ou por unidade;
6. evento corporativo e/ou por unidade;
7. regras de transferência entre unidades;
8. necessidade de cadastro formal de mesas no atendimento comum;
9. pagamento dividido;
10. regras de cancelamento e estorno de itens;
11. estoque de combos e composição;
12. política de anexos/arquivos;
13. quais configurações realmente precisam persistir no banco.

## 22. Regra para o banco final

Quando estas definições estiverem consolidadas, o banco V3 deverá ser criado de uma vez, com:
- tabelas;
- constraints;
- índices;
- funções;
- triggers;
- views;
- RLS;
- Storage;
- seeds iniciais;
- testes de integridade e concorrência.

Não usar o banco V3 como ambiente de prototipagem de cada pequeno ajuste. A modelagem deve amadurecer primeiro no nível de domínio e contratos.