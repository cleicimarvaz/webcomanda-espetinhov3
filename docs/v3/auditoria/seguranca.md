# Auditoria V3 — Segurança

## Achados confirmados no código

### 1. Senhas em texto puro — crítico

O login consulta diretamente a coluna `senha`:

`componentes/login.js`

A criação e edição de usuários também gravam a senha diretamente na tabela:

`componentes/user.js`

Isso significa que a senha não está sendo protegida por hashing no fluxo atual.

### 2. Autorização dependente do cliente — crítico

O nível do usuário é mantido no `localStorage`, e a interface usa esse valor para decidir quais recursos mostrar.

Isso deve ser tratado como controle de interface, não como mecanismo de segurança.

### 3. Operações sensíveis diretamente pelo frontend

O código executa operações de leitura e gravação diretamente no Supabase. A segurança efetiva dessas operações depende das políticas RLS do projeto Supabase, que não podem ser confirmadas apenas pelo código deste repositório.

### 4. Dados financeiros calculados no cliente

Há fluxos em que valores de venda são montados no navegador antes de serem persistidos. Para operações críticas, a V3 deve avaliar cálculo e validação no servidor/banco.

### 5. Possível XSS por HTML dinâmico

A auditoria anterior identificou vários usos de `innerHTML` e templates HTML com dados vindos do banco ou de telas públicas. O caso de reservas públicas merece atenção especial.

### 6. Backup

O backup automático da V2 utiliza uma chave pública do Supabase diretamente no script versionado.

A chave possui prefixo de chave publicável, portanto não deve ser tratada automaticamente como `service_role`. Mesmo assim, o acesso efetivo precisa ser protegido por RLS e políticas de Storage adequadas.

Além disso, o backup inclui a tabela `usuarios`, que no estado atual contém senhas em texto puro. Isso aumenta o impacto de qualquer acesso indevido ao backup.

## Prioridade para a V3

Antes de ampliar permissões ou adicionar integrações externas:

1. migrar autenticação para mecanismo seguro;
2. retirar senha do modelo de usuário acessível pelo cliente;
3. revisar RLS de todas as tabelas;
4. mover operações críticas para RPC/backend;
5. corrigir escaping/sanitização;
6. revisar o fluxo de backup;
7. adicionar testes de autorização e integridade.

## Regra

Nenhuma dessas correções será aplicada automaticamente nesta etapa de auditoria. Primeiro será definido o desenho da solução V3 e sua ordem de implantação.
