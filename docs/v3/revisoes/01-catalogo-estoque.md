# Revisão V3 — Catálogo + Estoque

## Objetivo

Esta revisão compara o código atual da V2/V3 piloto com o modelo funcional, o modelo relacional e as regras de negócio já definidos.

O objetivo aqui não é ainda criar o banco definitivo nem reescrever os módulos. É fechar o comportamento do domínio antes da consolidação do SQL final.

---

## 1. Situação atual encontrada

### Catálogo

O catálogo ainda é operado principalmente pelo módulo legado `componentes/produtos.js`, usando diretamente o banco V2.

Hoje o produto concentra vários conceitos em uma única linha:

- nome;
- categoria em texto livre;
- preço;
- custo;
- controle de estoque;
- estoque mínimo;
- fornecedor;
- código de barras;
- preparo;
- complementos;
- imagem e galeria.

Também existem recursos já incorporados ao legado:

- histórico de preços;
- composição de combos;
- múltiplas imagens;
- importação;
- controle de estoque;
- inventário via planilha.

### Estoque

A camada V3 já possui uma primeira implementação transacional:

`Tela → Adapter → Serviço → RPC → Banco V3`

O saldo passa a ser armazenado por:

`produto + unidade`

A movimentação transacional já possui:

- validação do usuário;
- validação da unidade;
- validação do vínculo organizacional;
- bloqueio da operação;
- atualização protegida do saldo;
- histórico da movimentação;
- idempotência por `operacao_id`;
- auditoria.

O inventário também possui caminho transacional V3.

---

## 2. O que deve ser mantido na V3

### Produto compartilhado por empresa

A direção atual continua adequada:

`empresa → produtos`

O produto é cadastrado uma vez e pode ser usado por várias unidades.

O estoque não pertence ao produto diretamente.

### Estoque por unidade

Fonte oficial:

`estoque_produto_unidade`

Histórico:

`estoque_movimentacoes`

A coluna legada `produtos.estoque_atual` não deve existir como fonte oficial no modelo definitivo.

### Preço congelado na venda

O preço atual do produto não deve ser usado para reconstruir vendas antigas.

A V3 deve preservar o preço praticado no próprio item da venda.

### Histórico de movimentação

Não basta alterar saldo.

Toda alteração efetiva deve deixar um lançamento rastreável.

### Inventário estruturado

O inventário deve possuir cabeçalho e itens estruturados.

A planilha pode continuar como mecanismo de entrada/contagem, mas não deve ser a fonte do histórico.

---

## 3. Pontos críticos encontrados no catálogo

### 3.1 Categoria ainda é texto livre

O código normaliza a categoria, mas continua armazenando texto.

Isso reduz problemas de grafia, porém não resolve:

- nome amigável;
- ordenação;
- ativação/inativação;
- configuração por empresa;
- ícone;
- ordem de exibição;
- histórico.

### Direção V3

Manter a entidade `categorias_produto`.

O campo `produtos.categoria` deve evoluir para uma referência à categoria.

A categoria continua pertencendo à empresa.

---

### 3.2 Produto ainda concentra preço atual

O modelo V3 já prevê `produto_precos`, mas isso ainda não está refletido no código do catálogo.

A decisão de negócio sobre preço por empresa/unidade permanece aberta.

### Direção técnica

Não acoplar vendas ao campo de preço atual.

O serviço de catálogo deve fornecer o preço efetivo para o contexto atual, e o serviço de venda deve gravar esse valor no item vendido.

---

### 3.3 Exclusão física de produto

O código atual permite exclusão do produto.

Na V3, a exclusão física não deve ser o caminho normal para um produto que já tenha sido usado em:

- venda;
- comanda;
- pedido;
- estoque;
- inventário;
- composição;
- histórico.

### Direção V3

Usar inativação/arquivamento como comportamento normal.

Exclusão física deve ficar restrita a registros que nunca participaram de operações ou a procedimento administrativo controlado.

Isso preserva histórico e reduz quebra de relacionamentos.

---

### 3.4 Histórico de preço usa identificação fraca

No legado, o histórico registra o nome do usuário em texto.

### Direção V3

O histórico deve registrar:

- `usuario_id`;
- empresa;
- unidade quando aplicável;
- preço anterior;
- preço novo;
- origem;
- data.

O nome do usuário pode ser obtido por relacionamento no momento da consulta.

---

### 3.5 Imagens do produto

O legado já possui otimização e galeria, o que é útil.

Ainda existem duas questões arquiteturais:

1. a URL pública é armazenada diretamente no produto;
2. remover uma imagem da galeria não significa necessariamente remover o arquivo do Storage.

### Direção V3

Separar:

- arquivo;
- metadados;
- vínculo com entidade.

A política de Storage público/privado continua pendente, mas o modelo não deve depender da URL como se ela fosse a identidade do arquivo.

Também deve existir rotina para evitar arquivos órfãos.

---

## 4. Pontos críticos encontrados em combos

### 4.1 Expansão de combo ocorre no frontend

Hoje `produtos-combos.js` consulta a composição e cria itens extras para a baixa.

Isso é útil como etapa de transição, mas não deve ser a autoridade final.

### Problema

A baixa de estoque precisa ser correta mesmo quando:

- a venda vier de outro cliente;
- houver retry;
- houver concorrência;
- a operação for feita por outro fluxo;
- o frontend estiver desatualizado.

### Direção V3

A composição deve ser resolvida no serviço de venda/estoque ou em função transacional.

O navegador pode montar a prévia, mas o servidor deve recalcular a composição antes da baixa definitiva.

---

### 4.2 Regra de estoque do combo precisa ser explícita

Hoje a expansão preserva o item do combo e adiciona os componentes.

Isso pode produzir uma ambiguidade:

- o combo controla estoque próprio;
- os componentes também controlam estoque.

Se os dois forem baixados, pode ocorrer dupla redução.

### Direção proposta para modelagem

O modelo deve suportar explicitamente uma estratégia de estoque do produto composto.

Exemplos conceituais:

- `nenhum`;
- `produto_pronto`;
- `componentes`.

A opção escolhida para cada produto deve determinar o comportamento transacional.

A decisão funcional definitiva fica registrada antes do SQL final.

---

### 4.3 Combos aninhados

O editor atual impede escolher outro combo como componente.

Isso simplifica a implementação e evita ciclos simples.

Na V3, a regra deve ficar explícita:

- combo pode ou não conter combo;
- se puder, o servidor precisa detectar ciclos;
- a expansão precisa ter limite seguro de profundidade.

A direção atual mais simples é manter componentes de combo como produtos não compostos.

---

### 4.4 Duplicidade de componente

A chave lógica deve impedir que o mesmo componente apareça duas vezes no mesmo combo.

Se a quantidade precisar ser alterada, a operação deve atualizar a composição existente.

---

## 5. Pontos críticos encontrados no estoque

### 5.1 Serviço atual está no caminho certo

O serviço V3 já concentra:

- entrada;
- saída;
- inventário;
- operação idempotente;
- contexto de unidade.

Isso deve ser preservado como padrão para os próximos serviços.

---

### 5.2 Validação de quantidade precisa ficar mais rígida

A camada JavaScript normaliza quantidade usando `Number()`, enquanto a RPC valida novamente.

A validação definitiva deve garantir:

- número finito;
- maior que zero;
- precisão suportada;
- produto válido;
- produto pertencente à empresa;
- produto habilitado para estoque.

---

### 5.3 Saldo negativo

A RPC atual mantém saldo negativo por compatibilidade com o legado.

Essa é uma regra de transição, não uma regra que precisa permanecer no modelo final.

Antes do banco definitivo deve ser decidido se cada unidade trabalhará com:

- saldo negativo permitido;
- bloqueio de saída sem saldo;
- bloqueio apenas abaixo de um limite;
- exceção administrativa.

O modelo deve permitir a regra sem depender do frontend.

---

### 5.4 Origem da movimentação

A movimentação já possui `motivo`, mas a arquitetura V3 prevê também origem.

### Direção V3

Padronizar a origem, por exemplo:

- ajuste_manual;
- inventario;
- venda;
- cancelamento_venda;
- transferencia;
- compra;
- outro.

Assim os relatórios não precisam interpretar texto livre.

---

### 5.5 Transferência entre unidades

O modelo já prevê:

- `transferencias_estoque`;
- `transferencia_itens`.

Essa previsão deve ser mantida.

A transferência precisa ser uma única operação lógica, gerando:

`saída na origem + entrada no destino`

A unidade de origem e a unidade de destino pertencem à mesma empresa.

O recurso pode ser implementado depois, mas o modelo não deve dificultar sua inclusão.

---

### 5.6 Inventário

O caminho V3 atual já executa o ajuste de forma transacional.

Antes do SQL definitivo, ainda precisamos fechar:

- se inventário terá estados intermediários;
- se haverá abertura de inventário e posterior contagem;
- se serão permitidos vários inventários simultâneos por unidade;
- como impedir que uma contagem antiga sobrescreva uma movimentação mais recente;
- quais produtos entram na contagem.

A regra importante é que o ajuste use o saldo protegido no momento da operação.

---

## 6. Integração V2 → V3

Este é o ponto mais importante para a transição atual.

O catálogo continua V2, enquanto o estoque experimental pode operar V3.

Portanto, **a feature flag de estoque não deve ser tratada como habilitação geral da V3**.

Com a flag ligada, a tela de estoque consulta produtos do banco V3.

Isso significa que a migração de estoque pressupõe que:

- os produtos existam no banco V3;
- os IDs utilizados sejam IDs válidos do V3;
- o contexto organizacional esteja configurado;
- o usuário tenha vínculo;
- o saldo inicial esteja preparado.

### Regra operacional

Enquanto o catálogo V3 não estiver implantado, não habilitar a flag transacional em produção.

---

## 7. Ajustes técnicos recomendados antes do SQL definitivo

### Catálogo

1. Criar categoria como entidade.
2. Separar preço atual de histórico.
3. Preservar preço efetivo no item de venda.
4. Trocar exclusão física por inativação como regra normal.
5. Identificar ator por `usuario_id`.
6. Definir estratégia de imagens e Storage.
7. Definir SKU/código de barras e seu escopo.
8. Definir estratégia de estoque de produtos compostos.

### Estoque

1. Manter saldo por produto/unidade.
2. Manter movimentação como histórico oficial.
3. Padronizar origem da movimentação.
4. Manter idempotência.
5. Manter bloqueio transacional.
6. Prever transferência entre unidades.
7. Estruturar inventário e itens.
8. Fechar política de saldo negativo.
9. Validar quantidades no serviço e novamente no servidor.
10. Proibir que o frontend seja a autoridade do saldo.

---

## 8. Decisões técnicas fechadas nesta revisão

Estas decisões podem ser tratadas como base arquitetural:

| Tema | Direção V3 |
|---|---|
| Produto | pertence à empresa |
| Categoria | entidade própria por empresa |
| Estoque | por produto + unidade |
| Fonte oficial do saldo | `estoque_produto_unidade` |
| Histórico do estoque | `estoque_movimentacoes` |
| Exclusão de produto usado | inativação/arquivamento |
| Histórico de preço | ator por `usuario_id` |
| Composição | relação estruturada |
| Baixa de combo | servidor/serviço deve recalcular |
| Idempotência | `operacao_id` |
| Transferência | operação única com origem e destino |
| Inventário | cabeçalho + itens + ajustes rastreáveis |
| Frontend | validação para UX; nunca autoridade final |

---

## 9. Decisões funcionais que continuam abertas

Ainda dependem de definição do negócio:

1. preço único por empresa, preço por unidade ou padrão + sobrescrita;
2. estratégia de estoque de combo;
3. saldo negativo;
4. uso de unidades fracionadas para produtos;
5. permitir ou não combo dentro de combo;
6. política de transferência entre unidades;
7. política definitiva de Storage;
8. regra de SKU/código de barras;
9. ciclo completo do inventário.

---

## 10. Conclusão da revisão

O domínio de Catálogo + Estoque já possui uma base suficientemente definida para orientar a V3, mas ainda não é o momento de consolidar o banco físico.

O principal ajuste de arquitetura é separar claramente:

`Catálogo da empresa`

de

`Estoque operacional da unidade`

e fazer com que vendas, combos e inventário consumam esses serviços sem depender de estado do navegador.

A próxima revisão deve usar as mesmas regras para **Atendimento + Comandas + Cozinha**, porque esses fluxos são os principais consumidores do catálogo e do estoque.
