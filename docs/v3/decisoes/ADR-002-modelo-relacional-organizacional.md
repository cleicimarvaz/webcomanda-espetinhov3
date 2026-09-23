# ADR-002 — Modelo relacional organizacional

## Status

Proposto.

## Contexto

A V2 possui a tabela `usuarios` como uma estrutura central de identidade e autorização, com `nivel` usado pelo frontend. Não existe uma relação formal entre usuário, empresa e unidade.

A V3 precisa suportar múltiplas unidades e permissões diferentes por contexto.

## Decisão proposta

Adotar as entidades:

- `empresas`;
- `unidades`;
- `usuarios`;
- `membros_organizacao`;
- `papeis`;
- `permissoes`;
- `papel_permissoes`.

O vínculo `membros_organizacao` será responsável por relacionar usuário, empresa, unidade e papel.

## Motivo

Uma tabela intermediária única permite que o mesmo usuário tenha acessos diferentes sem duplicar identidade.

## Consequências

- o schema ficará mais relacional;
- será necessário migrar usuários existentes;
- várias tabelas precisarão receber contexto organizacional;
- RLS poderá usar o vínculo como base;
- a interface precisará lidar com unidade ativa;
- relatórios poderão consolidar por empresa ou separar por unidade.

## Alternativas descartadas para o desenho inicial

### `unidade_id` diretamente em `usuarios`

Não suporta adequadamente o mesmo usuário atuando em várias unidades.

### Duplicar usuários por unidade

Cria múltiplas identidades para a mesma pessoa.

### Somente `empresa_id` e `unidade_id` nas tabelas, sem vínculo central

Duplicaria regras de autorização e dificultaria manutenção das policies.

## Próxima validação

Mapear as 21 tabelas para chaves organizacionais e definir quais relações devem ser diretas e quais devem herdar o contexto por FK.