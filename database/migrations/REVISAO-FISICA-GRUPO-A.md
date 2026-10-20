# Revisão física — Grupo A: fundação, organização e identidade

**Status:** proposta técnica para revisão; ainda não é SQL executável.
**Ambiente:** PostgreSQL 18.6 local, Docker e DBeaver validados.
**Estado do banco:** nenhuma migration de domínio aplicada.

## Objetivo

Definir os padrões físicos que orientarão a primeira migration de domínio da V3 e evitar misturar decisões de identidade, autorização e estrutura organizacional com tabelas comerciais.

Referências funcionais:

- `docs/v3/arquitetura/02-modelagem/modelo-relacional-completo-v3.md`
- `docs/v3/decisoes/adrs/ADR-004-fechamento-decisoes-negocio-v3.md`
- `database/migrations/PLANO-MIGRATIONS-FISICAS-V3.md`

## 1. Padrões de tipos propostos

| Necessidade | Padrão proposto | Motivo |
|---|---|---|
| Chaves primárias e FKs internas | `uuid` | Tipos consistentes em toda a V3 e independentes do provedor de hospedagem. |
| Geração de UUID | `gen_random_uuid()` | Disponível no PostgreSQL moderno sem exigir `pgcrypto` apenas para gerar UUID. |
| Instantes de eventos | `timestamptz` | Preserva o instante e permite conversão para o fuso de exibição. |
| Data civil sem horário | `date` | Para datas de calendário, quando realmente não houver horário. |
| Dinheiro, preço, custo e pagamentos | `numeric(14,2)` como padrão inicial | Evita imprecisão binária de ponto flutuante. Casos de maior escala devem ser revisados antes do SQL final. |
| Quantidades de estoque | `numeric(16,3)` como padrão inicial | Suporta fracionamento previsto no ADR-004. A precisão será validada por domínio. |
| Códigos e descrições | `text` com constraints quando necessário | Flexível e simples de portar entre provedores PostgreSQL. |
| Estados de negócio | `text` + `CHECK` | Facilita evolução controlada sem depender de tipos `ENUM` nativos. |
| Metadados flexíveis | `jsonb` somente quando fizer sentido | Para metadados de auditoria/configuração, não para substituir relações comerciais normalizadas. |

Esses padrões são uma proposta para o Grupo A. Precisões específicas de preço, quantidade, limites e cálculo financeiro devem ser conferidas com os domínios antes de congelar o SQL.

## 2. Identificadores e identidade externa

### 2.1 IDs internos

Proposta: usar `uuid` para todas as PKs das entidades da V3, inclusive `usuarios`. O schema provisório contém mistura de `bigint` e `uuid`; essa mistura não deve ser copiada para o schema definitivo.

Como o banco V3 é separado do banco V2, IDs numéricos da V2 não serão tratados como PKs da V3. A eventual importação de usuários/dados antigos usará uma relação de correspondência explícita, sem pressupor que os IDs coincidam.

### 2.2 Não gravar senhas em `usuarios`

`usuarios` representa o perfil interno da aplicação; não armazena senhas nem tokens de sessão. A autenticação e a verificação das credenciais ficam em um serviço de autenticação.

### 2.3 Entidade de identidade externa a considerar

Para não acoplar o schema a `auth.users`, `auth.uid()`, Supabase Auth ou a um único fornecedor de autenticação, propõe-se avaliar uma tabela `identidades_autenticacao` com:

- `id uuid` como PK;
- `usuario_id uuid` como FK para `usuarios`;
- `issuer text` e `subject text` para identificar a identidade emitida por um provedor;
- `created_at timestamptz` e, se necessário, `last_authenticated_at timestamptz`;
- unicidade em `(issuer, subject)` e índice em `usuario_id`.

Essa entidade não está na lista canônica atual. Ela é uma proposta estrutural e só deve ser incorporada ao modelo funcional/relacional após aprovação. O schema não deve criar FK direta para tabelas de autenticação de um provedor.

## 3. Organização e integridade de tenant

### 3.1 Empresa e unidade

- `empresas.id` e `unidades.id` serão `uuid`.
- `unidades.empresa_id` referencia `empresas.id`.
- `unidades` deverá ter uma chave/constraint `UNIQUE (empresa_id, id)` para permitir FKs compostas de tenant.
- Registros que guardam simultaneamente `empresa_id` e `unidade_id` deverão validar que a unidade pertence àquela empresa.

### 3.2 FKs compostas

Para entidades com escopo de empresa, a integridade organizacional deve ser garantida por FKs/constraints no banco, não apenas pelo frontend. Quando necessário, usar a combinação `(empresa_id, entidade_id)` ou `(empresa_id, unidade_id)` para impedir vínculos cruzados entre empresas.

### 3.3 Vínculos de organização

`membros_organizacao.unidade_id IS NULL` representa escopo empresarial, conforme o modelo funcional. Proposta de unicidade: permitir somente um vínculo ativo por `(usuario_id, empresa_id)` quando o escopo for empresarial, e somente um vínculo ativo por `(usuario_id, empresa_id, unidade_id)` quando for escopo de unidade. Índices únicos parciais podem expressar esses dois casos.

A proposta pressupõe um papel por usuário e escopo. Se o mesmo usuário precisar acumular vários papéis no mesmo escopo, será necessário alterar essa regra antes da migration.

### 3.4 Exclusão

Empresas, unidades, usuários e registros comerciais devem ser inativados quando precisarem sair de uso; a exclusão física não deve apagar histórico financeiro ou trilha de auditoria. As FKs do núcleo devem evitar `ON DELETE CASCADE` em dados históricos.

## 4. Papéis e permissões

Proposta para o primeiro modelo:

- `papeis` e `permissoes` possuem PK UUID e `codigo` único, estável e legível.
- `papel_permissoes` usa PK composta `(papel_id, permissao_id)`.
- papéis/permissões desativados permanecem no banco para preservar significado histórico.
- a lista de permissões é seed versionada; o frontend não decide autorização por um `nivel` numérico local.

Antes do SQL final, revisar se papéis serão exclusivamente globais do sistema ou se a primeira entrega permitirá papéis personalizados por empresa. O modelo atual descreve papéis e permissões, mas não fecha essa distinção com suficiente precisão.

## 5. Auditoria

A tabela `auditoria` deve ser append-only para o papel de runtime da aplicação. O desenho físico deve contemplar:

- `id uuid`;
- usuário/empresa/unidade quando identificáveis;
- ação, entidade, identificador da entidade, origem e instante;
- resultado da operação;
- `metadata jsonb` para dados auxiliares sem armazenar senhas, tokens, segredos ou payloads sensíveis indiscriminadamente.

A rotina de auditoria crítica precisa participar da mesma transação da operação auditada quando a regra exige atomicidade. Falhas de autorização e tentativas negadas podem precisar de um canal separado caso a transação seja revertida.

Não criar cascatas que apaguem auditoria quando um usuário ou registro de negócio for desativado.

## 6. Segurança e acesso ao banco

### 6.1 Implicação da escolha de PostgreSQL portável

Uma aplicação hospedada na Vercel não deve conectar o navegador diretamente ao PostgreSQL com uma `DATABASE_URL`. A conexão com credenciais fica no servidor/backend; o navegador chama endpoints autenticados. Esta é uma mudança arquitetural em relação aos módulos V2 que usam diretamente o cliente Supabase no frontend.

Para a V3 ser realmente portável entre PostgreSQL local, Neon, Supabase e VPS, o backend não deve depender obrigatoriamente de APIs específicas do Supabase para acesso ao banco.

### 6.2 Contexto de usuário e RLS

A estratégia concreta de autenticação ainda precisa ser definida antes de escrever policies. O modelo de dados não deve chamar diretamente `auth.uid()` nem depender de `auth.users` no SQL base se a portabilidade entre provedores for requisito.

Proposta: o backend autentica o usuário e define, no começo de cada transação, um contexto de sessão confiável e limitado à transação. As funções/policies do banco usam esse contexto; a aplicação usa conexões pool sem deixar contexto de um usuário vazar para a próxima requisição.

O contexto `app.usuario_id` só é confiável quando a conexão é privada ao backend e o backend deriva o valor de uma sessão/token já validado. Usuários finais nunca recebem credenciais PostgreSQL nem conectam diretamente ao banco.

### 6.3 Papéis de banco separados

É necessário separar:

- papel de proprietário/administrador do schema;
- papel de migration, autorizado a aplicar DDL;
- papel runtime da aplicação, com privilégios mínimos e sem `SUPERUSER`, `BYPASSRLS` ou propriedade das tabelas protegidas.

No Docker local atual, `POSTGRES_USER=webcomanda` é o usuário administrativo criado pela imagem oficial. Ele serve para desenvolvimento/DBeaver e runner local de migrations; **não deverá ser usado como credencial da aplicação V3 na Vercel**. O papel runtime restrito será criado e concedido na fase de segurança.

### 6.4 Quando ativar RLS

RLS será obrigatório antes de integrar a aplicação V3 a dados reais. As policies dependem da decisão de autenticação/backend, então precisam ser definidas e testadas em conjunto. Não abrir acesso anônimo a tabelas de domínio.

## 7. Convenções gerais de constraints

- Valores financeiros e quantidades têm `CHECK` para impedir negativos quando a regra de negócio proíbe.
- Relações obrigatórias usam `NOT NULL` e FKs explícitas.
- Campos únicos respeitam o escopo correto (global, empresa ou unidade).
- Usar constraints compostas/índices parciais para regras de escopo, não verificações apenas na interface.
- Preferir soft delete/inativação para entidades usadas por registros históricos.
- `created_at` e `updated_at` são `timestamptz`; `updated_at` é mantido no backend ou por trigger comum do banco.
- SQL das migrations fica em arquivos versionados; scripts provisórios de `arq/` não são executados como schema final.

## 8. Pendências que bloqueiam a primeira migration executável

1. Aprovar ou rejeitar a entidade `identidades_autenticacao`.
2. Definir se papéis poderão ser personalizados por empresa na primeira entrega.
3. Fechar a estratégia de autenticação da V3 e o backend server-side que fará o acesso ao PostgreSQL portável.
4. Fechar a forma de definir o contexto de usuário na transação para RLS.
5. Definir os papéis técnicos do banco e os privilégios do runtime.

Essas pendências são de arquitetura física/segurança, não mudam o que já funciona no ambiente local. O banco deve continuar vazio de tabelas de domínio até elas serem fechadas.