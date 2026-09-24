# Serviço V3 — Contexto organizacional

## Objetivo

O `organizacaoServiceV3` prepara a aplicação para trabalhar com empresa, unidade e vínculo do usuário sem usar o `localStorage` como fonte de autorização.

A sessão atual da V2 continua sendo reconhecida por enquanto. Como o banco V3 é separado, o serviço não assume que o ID numérico do usuário seja igual nos dois bancos.

## Identidade durante a transição

O login atual continua vindo da sessão da V2.

O serviço V3 usa `localStorage.userLogin` apenas como identificador de ponte e procura esse login na tabela `usuarios` do banco V3. A partir daí, todas as consultas organizacionais usam o ID do usuário existente no banco V3.

Fluxo:

`sessão V2 → login → usuário correspondente no banco V3 → membros_organizacao → unidade`

Isso evita acoplamento por ID entre os bancos.

## Operações

### Listar vínculos

`organizacaoServiceV3.listarVinculos()`

Busca os vínculos ativos do usuário no banco V3 e as unidades ativas relacionadas.

### Obter contexto atual

`organizacaoServiceV3.obterContextoAtual()`

Consulta a unidade atualmente selecionada no navegador usando a chave:

`v3_unidade_id_atual`

A unidade só é aceita quando pertence aos vínculos ativos encontrados no banco V3.

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

Por isso as RPCs de estoque continuam validando o vínculo no servidor.

## Relação com o estoque

O serviço de estoque V3 recebe o `usuarioId` do banco V3 e exige `unidadeId`.

Com este serviço, a futura tela poderá:

1. descobrir as unidades disponíveis;
2. deixar o usuário selecionar a unidade;
3. manter a seleção durante a sessão;
4. passar o contexto para `estoqueServiceV3`;
5. deixar o banco validar o vínculo novamente.

Ainda não existe um seletor de unidade na interface da V2. Essa alteração fica para uma etapa posterior.

## Requisito para o banco V3

Cada usuário que utilizar a V3 precisa existir no banco V3 com o mesmo login usado na sessão atual.

A sincronização desses usuários pode ser temporária durante a migração e deverá ser substituída futuramente por uma identidade central baseada em autenticação própria da V3.
