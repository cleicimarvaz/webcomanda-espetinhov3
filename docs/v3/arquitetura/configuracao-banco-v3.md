# Configuração do banco de dados V3

## Objetivo

A V3 possui uma configuração própria para o acesso ao banco de dados.

A área fica em:

**Configurações → Sistema → Banco de Dados V3**

Nessa tela são informados:

- URL do projeto Supabase;
- chave pública/publishable.

## Armazenamento

A configuração é salva no `localStorage` deste navegador, usando a chave:

`webcomanda_v3_database_config`

Isso evita colocar a chave real no código versionado do projeto.

Como a chave usada no navegador deve ser pública/publishable, ela não deve ser confundida com uma chave secreta de backend.

## Cliente V3

Depois de configurada, a aplicação inicializa:

`window._supabaseV3`

A V2 continua usando:

`window._supabase`

Não existe substituição automática do cliente V2.

## Teste de conexão

O botão **Testar Conexão**:

1. salva temporariamente os dados informados;
2. recria o cliente V3;
3. consulta a tabela `empresas`;
4. informa se o banco respondeu.

A consulta pressupõe que a estrutura inicial da V3 já tenha sido criada.

## Limpar

O botão **Limpar** remove a URL e a chave armazenadas neste navegador e desativa o cliente V3 local.

Isso não apaga o banco nem modifica dados no Supabase.

## Observação sobre a chave da V2

A tela permite informar a chave que será utilizada pelo ambiente V3.

Caso V3 esteja em outro projeto Supabase, a URL e a chave devem corresponder a esse projeto. Uma chave de projeto diferente não deve ser tratada como credencial do novo projeto.

## Regra de segurança

Nunca informar neste campo uma chave:

- `service_role`;
- `secret`;
- qualquer credencial de backend.

Essas credenciais não devem chegar ao navegador.

## Próxima etapa

Depois de configurar a conexão, o banco V3 poderá ser criado e testado independentemente da base de dados da V2.
