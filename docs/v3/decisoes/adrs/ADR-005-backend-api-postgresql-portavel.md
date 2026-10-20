# ADR-005 — Backend/API server-side para acesso PostgreSQL portável

**Status:** aceita
**Data:** 2026-10-20
**Escopo:** WebComanda Espetinho V3; não altera o caminho de acesso da V2.

## Contexto

A V3 usará PostgreSQL padrão para facilitar desenvolvimento local com Docker e futura migração entre provedores compatíveis. O frontend atual contém páginas HTML/JavaScript e integrações diretas via cliente Supabase. Credenciais PostgreSQL não podem ser distribuídas ao navegador, e a V3 não deve depender obrigatoriamente de uma API de banco específica de um fornecedor.

A aplicação está planejada para poder ser hospedada na Vercel. Vercel Functions oferecem execução server-side em Node.js e suportam funções na pasta `api/` de um projeto sem framework. A escolha do endpoint exato e da autenticação será detalhada antes da implementação.

Referências técnicas oficiais:

- Vercel Functions / Node.js: https://vercel.com/docs/functions/runtimes/node-js
- Vercel Functions API: https://vercel.com/docs/functions/functions-api-reference
- Pool de conexões em Functions: https://vercel.com/kb/guide/efficiently-manage-database-connection-pools-with-fluid-compute

## Decisão

Todo acesso da **V3** ao PostgreSQL será feito exclusivamente por um backend/API server-side. O navegador chama endpoints da aplicação; não abre conexão PostgreSQL e não recebe a `DATABASE_URL` nem credenciais do banco.

Fluxo aprovado:

~~~text
Navegador (interface V3)
        ↓ HTTPS / API autenticada
Backend/API server-side (Vercel Functions ou ambiente compatível)
        ↓ autenticação + autorização + contexto empresa/unidade
Serviços de aplicação V3
        ↓ consultas parametrizadas/transações
Repositórios / driver PostgreSQL
        ↓ conexão privada usando segredo server-side
PostgreSQL padrão
  ├─ Docker local
  ├─ Neon ou outro serviço gerenciado
  └─ VPS/servidor próprio
~~~

## Regras obrigatórias

1. `DATABASE_URL` e quaisquer credenciais do banco são variáveis de ambiente server-side. Nunca usar prefixos de variáveis públicas como `NEXT_PUBLIC_` para segredos.
2. O navegador nunca se conecta diretamente à porta PostgreSQL e nunca recebe usuário/senha PostgreSQL.
3. O backend autentica cada requisição, valida a entrada, aplica autorização de papel/permissão e verifica o contexto `empresa_id`/`unidade_id`; não confia em IDs ou papéis enviados pelo navegador sem validação.
4. Consultas devem ser parametrizadas. SQL não pode ser montado por concatenação de dados fornecidos pelo cliente.
5. Operações críticas usam transações e idempotência no servidor/banco; totais financeiros ou saldos apresentados pelo frontend não são autoridade.
6. O papel de banco usado em runtime terá privilégio mínimo e não será proprietário das tabelas, `SUPERUSER` ou `BYPASSRLS`. O papel administrativo local `webcomanda` não será reutilizado como credencial runtime de produção.
7. O papel usado para migrations será distinto do papel runtime e só será disponibilizado ao processo controlado de implantação/migração.
8. RLS será uma camada adicional de defesa e será obrigatória antes de integrar a V3 a dados reais. A fonte confiável de contexto por transação deverá ser desenhada/testada para evitar vazamento de contexto por conexão reutilizada em pool.
9. Conexões serverless devem usar gestão/pooling adequado à plataforma e ao provedor. A aplicação encapsulará essa configuração para que trocar o provedor não exija reescrever os domínios.
10. O backend usará PostgreSQL e SQL padrão sempre que possível. APIs exclusivas do Supabase não serão dependência obrigatória para operações de dados da V3.
11. Logs e respostas de erro não podem expor senhas, tokens, URLs de conexão, consultas com dados sensíveis ou detalhes internos do banco.

## V2 e migração gradual

- A V2 permanece intacta e continua usando o caminho de acesso atual durante a transição.
- Não alterar `window._supabase`, `componentes/config.js` ou fluxos operacionais V2 por causa desta decisão.
- Novos módulos e endpoints V3 usam exclusivamente o backend/API e o banco V3 configurado para esse fim.
- A migração é gradual: componentes antigos continuam na V2 até serem migrados deliberadamente, testados e habilitados.
- Não apontar o backend V3 para o banco produtivo V2; o ambiente V3 é separado.

## O que esta decisão não define ainda

- Provedor de autenticação, formato de sessão e fluxo de recuperação de acesso.
- Se a identidade externa será representada por uma tabela `identidades_autenticacao` ou por outra abstração.
- Framework ou layout final da API além do padrão server-side; a primeira implementação poderá usar Vercel Functions Node.js em `api/` se compatível com o projeto.
- Estratégia específica de pooling e URL do provedor de produção.
- Contexto exato usado nas policies RLS e matriz final de privilégios.

Esses detalhes devem ser fechados antes da primeira migration de segurança e antes da API acessar dados reais.

## Consequências

### Positivas

- credenciais e regras críticas ficam fora do navegador;
- reduz dependência de Supabase para a persistência;
- permite usar PostgreSQL local, gerenciado ou próprio;
- cria um ponto único para autenticação, autorização, validação, transações, auditoria e idempotência;
- facilita testar endpoints e regras sem depender da interface.

### Custos

- é necessário construir, versionar, testar e manter endpoints de API;
- módulos V3 não poderão reutilizar diretamente operações de banco do frontend;
- conexão/pooling, timeouts, tratamento de erro e observabilidade precisam ser planejados para execução serverless.

## Critérios de validação antes de produção

- nenhum segredo PostgreSQL está no bundle do navegador;
- chamadas sem sessão válida são recusadas;
- tentativa de mudar `empresa_id` ou `unidade_id` no cliente não ultrapassa o escopo autorizado;
- o papel runtime não consegue alterar DDL ou ignorar RLS;
- testes cobrem autorização positiva e negativa;
- operações críticas são transacionais/idempotentes;
- pool e contexto por transação passam testes concorrentes;
- backup e restauração são testados no ambiente destino;
- integração V3 não altera fluxos V2.

## Próximos passos

1. Definir autenticação e sessão da V3.
2. Atualizar a revisão física do Grupo A com os limites da API e os papéis de banco.
3. Definir os contratos iniciais de API/serviços, incluindo saúde técnica sem expor detalhes sensíveis.
4. Implementar e testar um esqueleto de API server-side sem ler ou modificar tabelas de domínio.
5. Só depois fechar o modelo de RLS e criar as migrations físicas revisadas.