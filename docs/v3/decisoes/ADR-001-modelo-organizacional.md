# ADR-001 — Modelo organizacional

## Status

Proposto.

## Contexto

A V2 possui usuários, mas não possui um modelo explícito de empresa e unidade. A autorização é fortemente dependente de valores armazenados no navegador.

A V3 precisa suportar isolamento organizacional e permitir evolução para múltiplas unidades sem duplicar usuários.

## Decisão proposta

Adotar como modelo conceitual:

`empresa` → `unidades`

`usuário` → `vínculos com unidades`

`vínculo` → `papel/permissões`

E usar empresa/unidade como contexto de segurança das operações.

## Consequências

### Positivas

- permite multiunidade;
- evita duplicação de identidade;
- permite funções diferentes por unidade;
- fornece base para RLS;
- facilita auditoria contextual;
- reduz dependência de filtros da interface.

### Impactos

- será necessário migrar registros históricos;
- várias tabelas precisarão receber contexto organizacional;
- políticas RLS precisarão ser desenhadas;
- a sessão passará a carregar contexto organizacional;
- relatórios precisarão definir se agregam por unidade ou empresa.

## Alternativas consideradas

### Usuário vinculado diretamente a uma unidade

É simples, mas não atende bem a usuários que precisam operar em mais de uma unidade.

### Filtrar por unidade somente no frontend

Não fornece isolamento de segurança suficiente porque a API ainda pode ser chamada diretamente.

### Duplicar usuário para cada unidade

Cria identidades redundantes e dificulta administração.

## Próxima validação

Antes da implementação, mapear cada tabela atual para uma destas categorias:

- global;
- empresa;
- unidade;
- usuário;
- público.

Depois disso, desenhar as policies RLS correspondentes.