# Plano de migrations físicas — WebComanda V3

**Status:** planejamento; nenhuma migration de domínio foi aplicada.
**Referência funcional:** `docs/v3/arquitetura/02-modelagem/modelo-relacional-completo-v3.md`.
**Decisões de negócio:** `docs/v3/decisoes/adrs/ADR-004-fechamento-decisoes-negocio-v3.md`.

Este documento define a ordem de construção do SQL físico. Os grupos abaixo são uma proposta técnica para orientar a implementação; os nomes/versões finais serão gerados pelo Dbmate quando cada migration estiver revisada. Não criar nem executar migrations de domínio apenas a partir desta lista.

## Antes de escrever a primeira migration

Resolver e documentar estes detalhes físicos para o modelo inteiro:

1. Estratégia de IDs e referências: especialmente `usuarios`, que precisa separar a identidade de autenticação do perfil interno e não depender de um provedor específico.
2. Regras para tenant e unidade: garantir integridade entre `empresa_id`, `unidade_id`, produto e demais entidades vinculadas.
3. Tipos padronizados: dinheiro (`numeric` com precisão acordada), quantidades decimais, datas (`timestamptz` para instantes), JSONB apenas onde houver necessidade real e códigos de estado consistentes.
4. Política de exclusão por FK: preservar operações financeiras, vendas, auditoria, ingressos e movimentos; evitar `CASCADE` em histórico de negócio.
5. Constraints de unicidade, vigência e concorrência: escopo empresarial, um caixa/inventário ativo por unidade, reservas incompatíveis e limites de lotes de ingresso.
6. Estratégia de autenticação e contexto de sessão que permitirá implementar RLS de forma real e testável.
7. Estratégia de Storage desacoplada do provedor e política de visibilidade dos arquivos.
8. Critérios de teste e recuperação para cada migration.

## Sequência proposta

### Grupo A — Fundação e organização

- Extensões realmente necessárias e convenções comuns.
- `empresas`, `unidades`, `usuarios`, `membros_organizacao`.
- `papeis`, `permissoes`, `papel_permissoes`.
- `auditoria`, `configuracoes_sistema` (incluindo os escopos global, empresa, unidade, usuário e dispositivo definidos funcionalmente).
- Constraints iniciais e índices alinhados às FKs.

### Grupo B — Cadastros compartilhados

- `clientes` e `fornecedores` com escopo de empresa.
- `categorias_produto`.

### Grupo C — Catálogo e preços

- `produtos`, `produto_precos`, `historico_precos`.
- `produto_codigos_barras`.
- `produto_composicao`.
- `grupos_complemento`, `complementos`, `produto_complementos`.
- Unicidade de SKU/códigos de barras por empresa e integridade de preços por escopo/vigência.

### Grupo D — Atendimento e cozinha

- `comandas`, `comanda_itens`.
- `pedidos`, `pedido_itens`.
- Estados, identidade histórica de sessões e concorrência de alterações.

### Grupo E — Caixa

- `caixas`, `movimentacoes_caixa`.
- Constraint para no máximo um caixa aberto por unidade.
- Regras de fechamento, imutabilidade após fechamento e reconciliação.

### Grupo F — Vendas e contas a receber

- `vendas`, `venda_itens`, `venda_item_complementos`, `venda_pagamentos`.
- `contas_receber`, `contas_receber_pagamentos`.
- Referências opcionais a caixa, comanda, cliente e unidade de recebimento, evitando FK circular desnecessária.
- Operações idempotentes, pagamentos divididos, fiado, recebimentos parciais e estornos compensatórios.

### Grupo G — Estoque e inventário

- `estoque_produto_unidade`, `estoque_movimentacoes`.
- `inventarios`, `inventario_itens`.
- `transferencias_estoque`, `transferencia_itens`.
- Fonte oficial de saldo por produto/unidade, bloqueio de saldo negativo por padrão e trilha de movimentos.

### Grupo H — Despesas e metas

- `despesas`, `despesa_pagamentos`, `metas_faturamento`.
- Escopo corporativo versus unidade, pagamento parcial e imutabilidade financeira após pagamento.

### Grupo I — Eventos e reservas

- `eventos`, `evento_mesas`, `reservas_evento`, `reserva_mesas`.
- `patrocinadores`, `evento_patrocinadores`.
- Restrições de reserva ativa, retenção/expiração e valores congelados.

### Grupo J — Ingressos

- `tipos_ingresso`, `lotes_ingresso`, `ingressos`.
- `transferencias_ingresso`, `validacoes_ingresso`, `portarias_evento`.
- `solicitacoes_ingresso`, `solicitacao_ingresso_itens`.
- Limites transacionais, códigos não previsíveis, histórico de titular e regras de reentrada.

### Grupo K — Arquivos e impressão

- `arquivos` com metadados que não dependam de Supabase Storage.
- `impressoes` para registrar tentativas, resultados e reimpressões sem repetir operações de negócio.

### Grupo L — Regras transacionais, auditoria e segurança

- Funções e triggers para integridade que não pode depender da interface.
- Idempotência e transações de venda, caixa, estoque, inventário, transferências, reservas e ingressos.
- RLS e policies por empresa/unidade, depois de definida a fonte confiável do contexto autenticado.
- Testes para acesso autorizado/negado, integridade de tenant, concorrência e tentativas de contornar regras pela API.

### Grupo M — Views, índices finais e testes de integração

- Views de consulta somente após fixar os nomes e os tipos finais.
- Índices validados pelos padrões de consulta.
- Testes de instalação do zero e de aplicação incremental de todas as migrations.
- Teste de `pg_dump`/`pg_restore` em banco descartável.

## Regras de execução

- Dbmate usa nomes de migration versionados por data/hora e blocos `-- migrate:up` / `-- migrate:down`.
- A tabela de controle `schema_migrations` é gerenciada pelo Dbmate; não criar uma tabela manual concorrente.
- Uma única execução de migration por vez; não iniciar runners em paralelo.
- Criar uma migration, revisar o SQL, testá-la no banco local e só então considerá-la pronta.
- A migration aplicada não deve ser editada; correções posteriores entram em uma nova migration.
- Nunca executar `up`, `drop`, `load` ou `migrate` sem conferir o impacto. `migrate` só será autorizado quando houver scripts aprovados.
- Não importar migrations históricas `arq/migracoes-v3/001–008` como migrations da base nova.
- Não executar `arq/schema-v3-base.sql`, `arq/funcoes-v3/` ou bootstrap provisório como schema definitivo.

## Estado observado em 2026-10-20

- PostgreSQL 18.6 local confirmado por `SELECT current_database(), current_user, version()`.
- DBeaver conectado ao banco `webcomanda_v3_dev`.
- Dbmate 2.36.0 executado pelo Docker.
- `dbmate status`: `Applied: 0`, `Pending: 0`.
- Nenhuma migration de domínio foi aplicada.

## Próxima tarefa técnica

Fazer a revisão física de tipos, IDs, FKs, constraints e estratégia de autenticação/RLS do Grupo A antes de gerar o primeiro arquivo executável. A implementação começa por um draft versionado, não por execução direta no banco.