# Arquitetura da API server-side — WebComanda V3

**Status:** direção arquitetural aceita no ADR-005; implementação ainda não iniciada.

## Objetivo

Definir a fronteira entre a interface V3 e o PostgreSQL. A interface deverá chamar uma API autenticada; apenas código server-side terá as credenciais de conexão.

## Diagrama

~~~text
HTML / JavaScript / PWA
          ↓ fetch HTTPS
       /api/v3/*
          ↓
Autenticação da requisição
          ↓
Autorização e contexto empresa/unidade
          ↓
Serviço de aplicação / regras do domínio
          ↓
Repositório (SQL parametrizado + transações)
          ↓
PostgreSQL
~~~

## Responsabilidade de cada camada

### Interface

- apresenta os dados e recolhe a intenção do usuário;
- chama endpoints próprios da V3;
- não armazena credenciais PostgreSQL;
- não decide a autorização definitiva;
- não é autoridade para totais financeiros, estoque, limites de ingressos ou estados finais.

### API / backend

- valida a sessão/autenticação;
- valida esquema e tamanho dos dados de entrada;
- deriva do contexto autenticado o usuário e os vínculos organizacionais;
- aplica permissões e regras de domínio;
- usa consultas parametrizadas;
- abre transações para operações atômicas;
- registra auditoria e chave de idempotência onde a operação exigir;
- devolve erros seguros e respostas JSON previsíveis.

### Persistência PostgreSQL

- impõe PK, FK, UNIQUE, CHECK e demais restrições de integridade;
- implementa funções/triggers transacionais quando necessários;
- aplica RLS como segunda barreira antes de dados reais;
- não expõe acesso anônimo a tabelas de negócio.

## Layout inicial de referência na Vercel

O projeto atual é baseado em arquivos HTML/JavaScript. Vercel Functions Node.js podem ser colocadas na pasta `api/` no nível do projeto. O layout preciso será confirmado com o build/deploy de teste antes de adotar rotas de domínio.

Exemplo ilustrativo futuro:

~~~text
api/
└── v3/
    ├── health.js
    ├── session.js
    ├── products.js
    └── stock/
        └── movements.js
~~~

O exemplo não é código implementado. Rota de saúde não deverá retornar `DATABASE_URL`, versão detalhada do servidor, credenciais ou outros dados internos ao público.

## Configuração e segredos

A API recebe `DATABASE_URL` por ambiente server-side. Essa variável não pode ser incluída nos assets servidos ao navegador, em `localStorage`, logs públicos ou Git.

A conexão local é configurada para desenvolvimento. Em ambiente remoto, a URL, certificados e estratégia de pooling dependem do provedor. A aplicação deve encapsular o driver/acesso ao banco para evitar dependência de um fornecedor.

Separar, por finalidade:

- credencial administrativa usada para bootstrap/desenvolvimento local;
- credencial de migration/implantação;
- credencial runtime com privilégios mínimos.

Não utilizar a credencial administrativa `webcomanda` do container local como usuário runtime de produção.

## Transações, pooling e contexto RLS

As operações de múltiplas etapas devem ocorrer numa transação da mesma conexão PostgreSQL. Se o contexto do usuário for armazenado em variáveis de sessão PostgreSQL para policies, ele deve ser definido localmente à transação, não deixado persistente em conexão reaproveitada por pool.

Cada execução deve garantir que o cliente seja liberado mesmo diante de exceções. As queries devem usar parâmetros; nomes de tabela/coluna dinâmicos, quando inevitáveis, devem ser escolhidos por listas permitidas e nunca recebidos diretamente do navegador.

RLS não substitui autenticação do backend nem correção contra SQL injection. O papel runtime deve ter privilégios mínimos, e as policies precisam ser testadas com tentativas de acesso a outra empresa/unidade.

## Erros e respostas

A API deve adotar envelope JSON consistente, por exemplo:

~~~json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Confira os dados enviados."
  }
}
~~~

O envelope é um exemplo de contrato e não está implementado. A resposta ao cliente não deve incluir stack trace, query, nome interno de tabela, senha ou string de conexão.

## Migração incremental

- V2 permanece inalterada durante esta etapa.
- Nenhuma tela deve ser convertida de Supabase direto para API sem uma tarefa específica de migração e smoke tests.
- Novos serviços V3 são desenhados atrás da API e do PostgreSQL V3.
- Backend, banco e rotas V3 são ativados deliberadamente por etapa/feature flag se houver integração gradual com telas compartilhadas.

## Próxima etapa

Antes de consultar tabelas de domínio, selecionar o mecanismo de autenticação e definir o contrato de sessão. Em seguida, construir uma função de API técnica mínima que não altere os dados, testar localmente e validar um deploy de demonstração.