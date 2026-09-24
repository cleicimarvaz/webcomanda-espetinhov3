# Pre-flight do banco V3

Este pre-flight valida se o banco novo foi criado a partir do schema esperado antes de qualquer teste funcional.

## O que ele verifica

- tabelas fundamentais da V3;
- existência das funções transacionais de estoque;
- views de apoio;
- ausência da coluna `usuarios.senha`;
- triggers de integridade;
- estado do RLS no bootstrap.

## Como usar

1. Criar um projeto Supabase separado para a V3.
2. Executar `arq/schema-v3-base.sql`.
3. Executar `arq/funcoes-v3/001-estoque-transacional.sql`.
4. Executar o bootstrap administrativo apenas após revisar os dados de exemplo.
5. Executar `arq/testes-v3/001-validacao-schema-base.sql`.
6. Executar este pre-flight para conferir funções, views e triggers.

O arquivo é somente leitura. Ele não cria, altera ou exclui nada.

## Resultado esperado

No bootstrap inicial:

- todas as tabelas fundamentais devem existir;
- `usuarios` não deve possuir a coluna `senha`;
- as funções transacionais da V3 devem aparecer com as assinaturas esperadas;
- as duas views V3 devem existir;
- RLS deve permanecer desligado até a etapa de autenticação e política de acesso da V3.

Depois dessa validação, o próximo teste deve ser feito com dados de desenvolvimento, usando o serviço de estoque V3 e uma unidade explicitamente selecionada.
