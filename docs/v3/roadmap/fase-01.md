# Fase 01 — Fundação técnica e segurança

## Objetivo

Construir as bases que permitirão evoluir o sistema com isolamento, autorização e operações críticas mais confiáveis.

## 1. Organização

Definir entidades e relações:

`empresa` → `unidade` → `usuário/perfil` → `dados operacionais`.

Precisamos decidir quais dados são globais à empresa e quais pertencem a uma unidade.

## 2. Identidade

Definir:

- provedor de autenticação;
- identidade interna;
- recuperação de acesso;
- sessão;
- papéis;
- permissões;
- vínculo usuário/unidade.

O nível armazenado em `localStorage` não deve ser a fonte de autorização.

## 3. Segurança de banco

Definir policies para:

- leitura;
- inserção;
- atualização;
- exclusão;
- ações administrativas;
- dados públicos.

Depois, habilitar e validar RLS gradualmente em ambiente de teste.

## 4. Camada de serviços

Criar o primeiro conjunto de serviços para operações críticas, sem migrar todos os módulos de uma vez.

Primeiros candidatos:

- venda;
- estoque;
- caixa;
- estorno;
- ingresso.

## 5. Auditoria

Definir um formato estruturado de evento de auditoria e uma função única para registrar operações relevantes.

## 6. PWA

Consolidar a existência de um único Service Worker oficial e uma única estratégia de versionamento do cache.

## 7. Critérios de saída

A fase estará pronta para avançar quando:

- organização estiver modelada;
- autenticação e autorização tiverem desenho definido;
- policies estiverem definidas e testadas;
- primeiro serviço transacional estiver funcionando;
- auditoria estruturada estiver disponível;
- PWA tiver uma estratégia única;
- houver testes básicos das regras de acesso.