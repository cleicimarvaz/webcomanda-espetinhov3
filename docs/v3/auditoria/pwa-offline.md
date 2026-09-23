# Auditoria de PWA e operação offline

## Estado atual

A V2 possui `manifest.json` e mecanismos de Service Worker. O objetivo atual é manter a interface e os assets disponíveis quando a conexão falha.

Existem dois arquivos com implementação de Service Worker: `sw.js` e `ws.js`. Eles possuem nomes de cache e listas de assets diferentes, embora implementem uma estratégia semelhante de Network First.

## O que funciona hoje

- cache de arquivos HTML, CSS, JavaScript e logo;
- atualização do cache quando a rede está disponível;
- fallback para cache quando uma requisição GET falha;
- instalação como aplicativo por meio do manifest;
- uso em dispositivos móveis;
- exclusão das chamadas ao Supabase da estratégia de cache;
- não interceptação de métodos diferentes de GET.

## Limitações observadas

O Service Worker não cria armazenamento local transacional para vendas, comandas, estoque, caixa ou financeiro.

As chamadas ao Supabase são explicitamente excluídas do cache. Portanto, uma página pode carregar offline e ainda assim não conseguir consultar ou gravar os dados necessários para operar.

Os dois Service Workers têm listas diferentes e fazem referência a `componentes/print.js`, arquivo que precisa ser confrontado com a estrutura real atual. Essa divergência aumenta a possibilidade de cache inconsistente.

Também há dependência de bibliotecas externas carregadas por CDN. Como essas origens são ignoradas pelo Service Worker, a disponibilidade offline depende de o navegador já possuir esses recursos em cache próprio.

## Estratégia sugerida para a V3

A V3 deve separar três níveis:

1. **Offline visual** — aplicação abre e navega sem internet.
2. **Offline operacional controlado** — operações selecionadas ficam em uma fila local segura.
3. **Sincronização transacional** — cada operação recebe identificador, estado, tentativa, confirmação e tratamento de conflito.

Para vendas, comandas, caixa e estoque, o segundo e o terceiro níveis só devem ser adotados após definição das regras de consistência e idempotência.

## Requisitos para uma futura sincronização

- identificador único por operação;
- fila persistente local;
- estado pendente/enviando/confirmada/erro;
- idempotência no servidor;
- ordenação quando houver dependência entre operações;
- controle de conflito;
- confirmação de sincronização;
- registro de auditoria;
- possibilidade de reprocessamento;
- sinalização clara ao operador.

## Conclusão

O PWA atual é principalmente uma camada de disponibilidade de interface. Ele não deve ser tratado como uma arquitetura offline completa da operação.