# Serviço V3 — Contexto organizacional

## Objetivo

O `organizacaoServiceV3` prepara a aplicação para trabalhar com empresa, unidade e vínculo do usuário sem usar o `localStorage` como fonte de autorização.

A sessão atual da V2 continua sendo reconhecida por enquanto. O serviço usa o `userId` da sessão somente para localizar os vínculos existentes no banco.

## Operações

### Listar vínculos

`organizacaoServiceV3.listarVinculos()`

Busca os vínculos ativos do usuário e as unidades ativas relacionadas.

### Obter contexto atual

`organizacaoServiceV3.obterContextoAtual()`

Consulta a unidade atualmente selecionada no navegador usando a chave:

`v3_unidade_id_atual`

A unidade só é aceita quando pertence aos vínculos ativos encontrados no banco.

### Definir unidade

`organizacaoServiceV3.definirUnidadeAtual(unidadeId)`

Valida a unidade contra os vínculos ativos antes de gravar a seleção local.

### Limpar unidade

`organizacaoServiceV3.limparUnidadeAtual()`

Remove somente a seleção local da unidade.

## Regra de segurança

A seleção local serve para contexto de interface.

Ela não substitui:

- RLS;
- políticas do banco;
- validação de empresa;
- validação de unidade;
- validação de permissão.

Por isso as RPCs de estoque continuam validando o contexto no servidor.

## Relação com o estoque

O serviço de estoque V3 exige `unidadeId` e `usuarioId`.

Com este serviço, a futura tela poderá:

1. descobrir as unidades disponíveis;
2. deixar o usuário selecionar a unidade;
3. manter a seleção durante a sessão;
4. passar o contexto para `estoqueServiceV3`;
5. deixar o banco validar o vínculo novamente.

Ainda não existe um seletor de unidade na interface da V2. Essa alteração fica para uma etapa posterior.
