# Revisão 07 — Checagem de consistência documental da V3

**Data:** 2026-09-25  
**Status:** concluída

## Objetivo

Verificar se os documentos canônicos da V3 usam as mesmas decisões, entidades e regras depois da organização da documentação e do fechamento do ADR-004.

## Resultado

A checagem foi realizada sobre:

- modelo funcional;
- modelo relacional;
- casos de uso;
- regras de negócio;
- contratos de serviços;
- mapeamento V2 → V3;
- decisões/ADRs;
- roadmap e índices de documentação;
- artefatos provisórios de banco e migrations históricas.

## Correções realizadas

### Organização

A documentação de arquitetura foi separada em:

1. visão;
2. modelagem;
3. serviços;
4. banco;
5. histórico de migrations;
6. segurança.

ADRs foram separados do histórico de decisões pendentes.

### Modelo funcional

Foram alinhadas as entidades novas:

- produto_codigos_barras;
- lotes_ingresso;
- transferencias_ingresso;
- portarias_evento;
- arquivos;
- impressoes.

Também foram removidas linguagens de proposta, como “candidata” e “recomendação”, nos pontos já decididos.

### Modelo relacional

O modelo relacional canônico passa a ser a referência para o SQL.

Foram consolidados:

- preço padrão + sobrescrita por unidade;
- estoque por produto/unidade;
- inventário estruturado;
- transferência de estoque;
- sessão de comanda;
- vendas e pagamentos;
- conta a receber com recebimento em outra unidade;
- eventos corporativos ou por unidade;
- reservas e mesas relacionais;
- tipo + lote de ingresso;
- transferência e validação de ingresso;
- múltiplas portarias;
- arquivos;
- histórico de impressão.

### Contratos

Os contratos de eventos, financeiro e relatórios foram ajustados para não apresentarem decisões funcionais já encerradas como pendências.

### Mapeamento V2 → V3

O mapeamento foi atualizado para refletir lotes de ingresso e histórico de transferência.

Também foi registrado que várias entidades são novas na V3 e não possuem equivalente 1:1 na V2.

### Histórico

As revisões antigas continuam preservadas como histórico. Quando elas contêm uma alternativa que depois foi descartada ou uma decisão que posteriormente foi fechada, isso não representa uma pendência atual.

## Pontos que continuam tecnicamente pendentes

Estes itens não são decisões de negócio abertas; são trabalhos de implementação:

- definir autenticação final;
- implementar contexto/sessão;
- definir e testar RLS;
- consolidar padrão de auditoria;
- implementar serviços transacionais;
- consolidar Service Worker;
- implementar fila/offline;
- definir tipos PostgreSQL e constraints;
- criar funções e triggers;
- definir índices;
- consolidar Storage;
- escrever SQL físico;
- executar testes no banco V3;
- validar concorrência.

## Conclusão

Não foi identificado conflito funcional relevante entre os documentos canônicos após as correções.

O conjunto documental está pronto para a próxima etapa de engenharia: transformar o modelo relacional em especificação física do banco e revisar os contratos técnicos contra essa especificação.

O banco V3 continua sem criação física nesta etapa.
