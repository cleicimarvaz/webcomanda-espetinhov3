# Contrato do serviço de identidade e acesso V3

## Responsabilidade

Centralizar autenticação, sessão, usuário, vínculos e autorização.

## Casos de uso

- autenticar usuário;
- encerrar sessão;
- recuperar acesso;
- listar vínculos organizacionais;
- selecionar unidade;
- verificar permissão;
- criar/editar/inativar usuário;
- atribuir papel;
- alterar permissões do papel.

## Contexto

O serviço deve produzir um contexto semelhante a:

\`\`\`js
{
  usuarioId,
  empresaId,
  unidadeId,
  papelId,
  permissoes: [],
  sessaoId
}
\`\`\`

## Autorização

\`temPermissao(codigo)\` é uma consulta de autorização, não apenas uma função visual.

A mesma regra deve ser verificável pelo backend/banco.

## Migração

Durante a transição, a V2 pode continuar autenticando enquanto a V3 resolve o perfil pelo identificador de login.

Essa ponte é temporária.

Antes da produção da V3, a autenticação deverá utilizar a identidade autenticada do próprio ambiente V3.

## Segurança

- nunca armazenar senha da V3 em texto puro;
- não usar \`localStorage.userNivel\` como autorização;
- não confiar em empresa/unidade informadas livremente pelo navegador;
- registrar alterações de acesso na auditoria.
