# Auditoria V3 — Banco de Dados e Autorização

## 1. Modelo atual

O schema da V2 concentra usuários, auditoria, produtos/estoque, vendas/comandas, caixa, financeiro, eventos e ingressos em um único banco Supabase.

Há relacionamentos por foreign key em várias áreas, mas a identificação do usuário em muitos registros ainda é feita por texto, por exemplo `usuario`, `vendedor`, `atendente` e `criado_por`.

Isso dificulta rastreabilidade e integridade quando um usuário é renomeado, desativado ou removido.

## 2. RLS

O próprio `schema-completo-novo-banco.sql` documenta que o RLS das tabelas públicas é desligado para reproduzir o comportamento da produção.

Esse é um achado confirmado e de prioridade crítica.

Na arquitetura atual, o navegador possui a chave pública do Supabase e acessa as tabelas diretamente. Sem RLS adequado, a API não possui uma barreira de autorização suficiente entre o usuário do sistema e os dados.

### Consequência para a V3

O desenho da V3 deve partir de:

- Supabase Auth ou outro mecanismo de identidade real;
- RLS habilitado;
- políticas por usuário/empresa/unidade e função;
- operações críticas protegidas no banco/backend;
- frontend tratando permissão como experiência de interface, não como autoridade.

## 3. Integridade financeira

O schema possui alguns `CHECK` úteis, por exemplo em contas a receber e composição de combos.

Porém ainda existem campos financeiros importantes com pouca proteção de domínio:

- preços;
- estoque;
- valores de caixa;
- totais de venda;
- descontos;
- taxas;
- movimentações.

A V3 deve definir quais regras precisam ser invariantes do banco, em vez de depender somente do JavaScript.

## 4. Vendas e comandas

`comandas.itens` e `historico_vendas.itens` são armazenados como JSONB.

Isso facilita a evolução rápida do frontend, mas limita consultas analíticas e integridade relacional.

Para a V3, não é obrigatório abandonar JSONB imediatamente. Primeiro devemos identificar quais informações precisam ser consultadas, auditadas ou agregadas com frequência.

Uma evolução possível é manter o snapshot JSONB da venda e acrescentar tabelas normalizadas para itens de venda/comanda.

## 5. Estoque

O modelo possui tanto `estoque` quanto `estoque_atual`, sendo o primeiro documentado como legado.

Isso é um sinal de dívida técnica.

Além disso, a baixa automática encontrada no frontend lê o estoque, calcula o novo valor e faz um UPDATE separado da movimentação. Isso não constitui uma operação transacional única.

Na V3, venda + baixa + movimentação devem ser tratadas como uma operação atômica.

## 6. Identidade

Muitos registros guardam apenas o nome/login textual do operador.

A V3 deve preferir:

- `user_id` para identidade;
- perfil/role separado;
- histórico preservado mesmo quando o nome muda;
- eventualmente `created_by`, `updated_by`, `approved_by` etc.

Textos como nome do usuário podem continuar existindo como snapshot quando houver necessidade histórica, mas não devem substituir o identificador.

## 7. Multiempresa

O schema atual não apresenta uma estrutura geral de empresa/unidade nos principais registros.

Se a V3 mantiver apenas um estabelecimento por banco, isso pode ser aceitável. Se o objetivo for SaaS multiempresa, será necessário projetar explicitamente:

`empresas` → `unidades` → usuários/membros → dados operacionais.

Esse ponto deve ser decidido antes da remodelação do banco.

## 8. Próximas verificações

Antes de criar uma nova modelagem:

1. levantar todas as tabelas do schema;
2. mapear PK/FK;
3. identificar campos legados;
4. identificar tabelas sem relacionamento;
5. separar identidade, configuração e dados operacionais;
6. decidir estratégia multiempresa;
7. desenhar RLS;
8. definir operações transacionais críticas.
