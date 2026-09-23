# Auditoria V3 — Banco de Dados e Autorização

## 1. Modelo atual

O schema da V2 possui 21 tabelas de aplicação no schema public:

**Identidade/auditoria:** usuarios, auditoria  
**Cadastros:** fornecedores, clientes, produtos, complementos  
**Estoque:** produto_composicao, historico_precos, inventarios, estoque_movimentacoes  
**Vendas/atendimento:** caixa, movimentacoes_caixa, comandas, historico_vendas  
**Financeiro:** despesas, contas_receber, metas_faturamento  
**Configuração:** configuracoes_sistema  
**Eventos:** eventos, reservas_evento, tipos_ingresso, ingressos

## 2. PKs e FKs

- usuarios: PK id
- auditoria: PK id
- fornecedores: PK id
- clientes: PK id
- produtos: PK id; FK fornecedor_id -> fornecedores.id
- produto_composicao: PK id; FKs combo_id e componente_id -> produtos.id
- historico_precos: PK id; FK produto_id -> produtos.id
- inventarios: PK id
- estoque_movimentacoes: PK id; FKs produto_id -> produtos.id e inventario_id -> inventarios.id
- complementos: PK id UUID
- caixa: PK id
- movimentacoes_caixa: PK id; FK id_caixa -> caixa.id
- comandas: PK id
- historico_vendas: PK id; FKs comanda_id -> comandas.id, cliente_id -> clientes.id e id_caixa -> caixa.id
- despesas: PK id; FK fornecedor_id -> fornecedores.id
- contas_receber: PK id; FKs cliente_id -> clientes.id e venda_id -> historico_vendas.id
- metas_faturamento: PK id
- configuracoes_sistema: PK id
- eventos: PK id UUID
- reservas_evento: PK id UUID; FK evento_id -> eventos.id
- tipos_ingresso: PK id UUID; FK evento_id -> eventos.id
- ingressos: PK id UUID; FKs evento_id -> eventos.id e tipo_ingresso_id -> tipos_ingresso.id

## 3. Relacionamentos

- fornecedores 1:N produtos
- fornecedores 1:N despesas
- produtos 1:N historico_precos
- produtos 1:N estoque_movimentacoes
- produtos 1:N produto_composicao, em dois papéis: combo e componente
- inventarios 1:N estoque_movimentacoes
- caixa 1:N movimentacoes_caixa
- caixa 1:N historico_vendas
- comandas 1:N historico_vendas
- clientes 1:N historico_vendas
- clientes 1:N contas_receber
- historico_vendas 1:N contas_receber
- eventos 1:N reservas_evento
- eventos 1:N tipos_ingresso
- eventos 1:N ingressos
- tipos_ingresso 1:N ingressos

## 4. Pontos estruturais

### Identidade

Grande parte das tabelas usa texto para identificar o operador, em vez de uma FK para usuarios.

Exemplos: usuario, vendedor, atendente, criado_por, cadastrado_por, autorizado_por, vendido_por e validado_por.

Na V3, esses campos devem ser avaliados para uso de user_id/created_by/updated_by/approved_by, preservando eventualmente o nome como snapshot histórico.

### JSONB

Os itens de comandas e vendas ficam em JSONB.

Isso facilita o frontend, mas reduz integridade referencial e dificulta consultas analíticas. Antes de substituir, precisamos cruzar o formato usado pelo código.

### Legados

- produtos.estoque é documentado como legado; estoque_atual é o campo utilizado atualmente.
- configuracoes_sistema mistura chave/valor com campos específicos.
- eventos.patrocinadores usa JSONB.
- eventos.mapa_url pode conter URL ou dados antigos em base64.

### Tabelas sem FK de saída

Não possuem FK para outras tabelas: usuarios, auditoria, fornecedores, clientes, inventarios, complementos, caixa, comandas, metas_faturamento, configuracoes_sistema e eventos.

Isso é aceitável para algumas entidades raiz, mas deve ser confrontado com o código para detectar relacionamentos mantidos apenas por texto.

## 5. RLS e Storage

O schema explicitamente desliga RLS das tabelas de aplicação para reproduzir a produção atual.

Há também políticas públicas de leitura, escrita, atualização e exclusão nos buckets produtos e eventos.

A V3 deve revisar ambos os pontos.

**Achado adicional:** a tabela inventarios é criada no schema, mas não aparece na lista usada pelo bloco que desliga RLS. Isso deve ser conferido no ambiente real.

## 6. Integridade transacional

Estoque, vendas e caixa possuem operações que hoje podem depender de várias chamadas do frontend.

Na V3, operações críticas devem ser tratadas como transações ou funções protegidas no banco/backend.

Também precisamos definir uma fonte de verdade para os totais de venda, já que historico_vendas.total é armazenado separadamente dos itens JSONB.

## 7. Próxima etapa

Agora o banco deve ser cruzado com o código JavaScript.

Vamos identificar:

1. tabelas realmente usadas por cada módulo;
2. colunas realmente usadas;
3. formatos dos JSONB;
4. referências de usuário;
5. campos legados;
6. tabelas/colunas não utilizadas;
7. operações críticas de venda, caixa, estoque e financeiro.

Só depois desse cruzamento vamos propor o modelo físico da V3.
