# Migration 002 — Backfill organizacional inicial

**Status: rascunho — não executar em produção.**

## Objetivo

Popular a fundação criada pela Migration 001 usando o ambiente atual da V2 como origem.

A migration cria, somente quando necessário:

- a empresa inicial;
- a primeira unidade;
- papéis de compatibilidade `ADMIN` e `VENDEDOR`;
- vínculos dos usuários atuais com a empresa, unidade e papel.

## Origem dos dados

Para o primeiro ambiente, a empresa/unidade tentam aproveitar dados já existentes em `configuracoes_sistema`, especialmente `nome_loja`, `telefone` e `endereco`.

Se essas informações não estiverem disponíveis, são usados nomes genéricos `Empresa Principal` e `Unidade Principal`.

## Mapeamento de usuário

`usuarios.nivel = ADMIN` ou login `admin` → papel `ADMIN`.

Qualquer outro nível atual → papel inicial `VENDEDOR`.

Esse mapeamento existe apenas para preservar o acesso durante a migração. Ele não representa o modelo definitivo de permissões da V3.

## O que não é migrado nesta etapa

- `auth_user_id` continua sem preenchimento;
- senha atual não é removida;
- dados de vendas continuam no modelo V2;
- estoque continua no modelo V2;
- caixa continua no modelo V2;
- nenhuma tabela operacional recebe `empresa_id`/`unidade_id` ainda;
- RLS continua desligado conforme o ambiente atual;
- nenhuma policy nova é criada.

## Segurança

Esta migration não cria autorização segura por si só. Ela apenas prepara o relacionamento organizacional.

Até a migração da autenticação e a implantação de RLS, a V2 continua dependendo do mecanismo legado.

## Validações antes da execução

Executar primeiro em uma cópia do banco e conferir:

1. quantidade de empresas criadas;
2. quantidade de unidades criadas;
3. quantidade de papéis;
4. quantidade de membros por papel;
5. usuários ativos e inativos;
6. nenhum usuário duplicado no contexto inicial;
7. empresa da unidade correta;
8. manutenção do funcionamento da V2.

## Próxima etapa

Depois do backfill, a próxima migração deverá preparar o primeiro domínio operacional para receber contexto de empresa/unidade, começando por uma tabela de baixo risco e alto valor estrutural.