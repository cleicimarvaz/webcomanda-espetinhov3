-- WebComanda Espetinho V3
-- Teste inicial de conexão PostgreSQL.
-- Somente leitura: não cria nem altera objetos ou dados.

select
    current_database() as banco,
    current_user as usuario,
    version() as versao;
