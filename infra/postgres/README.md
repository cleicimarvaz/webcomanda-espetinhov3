# PostgreSQL 18 local

Este diretório contém somente a infraestrutura de desenvolvimento do banco V3.

## Objetivo

Subir um PostgreSQL 18 local em Docker de forma reproduzível, sem amarrar a aplicação a um provedor específico.

O banco criado aqui é um **ambiente vazio de desenvolvimento**. O schema físico definitivo da V3 ainda será consolidado posteriormente.

## Requisitos

- Docker Desktop instalado e em execução.
- Docker Compose disponível pelo comando docker compose.

## Primeira configuração

Na primeira utilização, copie .env.example para .env e ajuste a senha local.

O arquivo .env não deve ser versionado.

## Subir o PostgreSQL

A partir deste diretório:

~~~bash
docker compose up -d
~~~

Verificar o estado:

~~~bash
docker compose ps
~~~

Ver os logs:

~~~bash
docker compose logs -f postgres
~~~

Parar os containers:

~~~bash
docker compose down
~~~

## Apagar também os dados locais

Use somente quando quiser recriar o banco local do zero:

~~~bash
docker compose down -v
~~~

Isso remove o volume do PostgreSQL.

## Conexão

Com a configuração padrão:

~~~text
Host:     localhost
Porta:    5432
Database: webcomanda_v3_dev
Usuário:  webcomanda
~~~

A aplicação poderá usar uma única variável de conexão, por exemplo:

~~~env
DATABASE_URL=postgresql://webcomanda:SENHA@localhost:5432/webcomanda_v3_dev
~~~

## SQL versionado

Os scripts SQL da V3 serão mantidos no Git em:

~~~text
database/
├── migrations/
├── functions/
├── seeds/
└── tests/
~~~

Os arquivos atuais em arq/ continuam sendo históricos/provisórios conforme a documentação da V3.

O PostgreSQL local **não executa automaticamente** o schema provisório. Isso é intencional: o banco físico definitivo só será aplicado quando o modelo relacional e o SQL final estiverem consolidados.

## Backup e migração

O ambiente deve ser tratado como um PostgreSQL padrão. Para backup lógico:

~~~bash
pg_dump -h localhost -p 5432 -U webcomanda -d webcomanda_v3_dev -Fc -f backup.dump
~~~

Para restauração:

~~~bash
pg_restore -h localhost -p 5432 -U webcomanda -d webcomanda_v3_dev --clean --if-exists backup.dump
~~~

Os comandos podem ser executados de outra máquina ou de um container que tenha as ferramentas cliente instaladas.

A mesma estratégia permite migrar posteriormente para outro PostgreSQL compatível sem alterar o modelo da aplicação apenas por causa do provedor.

## Regra da V3

A aplicação dependerá de **PostgreSQL**, e não de um provedor específico.

Docker, Neon, Supabase, VPS ou outro serviço poderão ser ambientes diferentes para o mesmo banco.
