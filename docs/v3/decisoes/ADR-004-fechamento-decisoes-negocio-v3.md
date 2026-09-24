# ADR-004 — Fechamento das decisões de negócio da V3

**Status:** Aceita para a modelagem V3  
**Data:** 2026-09-24  
**Escopo:** WebComanda Espetinho V3

## Objetivo

Fechar as decisões funcionais que estavam abertas nos documentos da V3 para que o modelo relacional, os serviços e o SQL definitivo possam ser revisados sem depender de hipóteses.

Estas decisões valem para a V3 e substituem as alternativas abertas anteriormente. Requisitos novos poderão gerar ADR posterior, sem alterar silenciosamente uma regra já consolidada.

---

## 1. Organização, catálogo e dados compartilhados

### 1.1 Preços

O produto terá **preço padrão da empresa** e poderá possuir **sobrescrita de preço por unidade**.

Regras:

- o preço padrão pertence à empresa;
- a unidade pode sobrescrever o preço quando necessário;
- a ausência de sobrescrita usa o preço padrão;
- cada venda congela o preço praticado no momento da operação;
- histórico de preços registra empresa/unidade, usuário, vigência e origem.

### 1.2 Clientes

Clientes são compartilhados **dentro da empresa**.

A relação com a unidade fica nas operações que representam o atendimento comercial, como venda, comanda e conta a receber.

Um cliente não é compartilhado entre empresas.

### 1.3 Fornecedores

Fornecedores são compartilhados **dentro da empresa**.

As unidades podem utilizá-los em compras, produtos e despesas conforme suas permissões.

### 1.4 Despesas corporativas

Despesas terão:

- `empresa_id` obrigatório;
- `unidade_id` opcional.

Sem unidade = despesa corporativa.

Com unidade = despesa atribuída àquela unidade.

### 1.5 Metas de faturamento

Serão permitidas **metas consolidadas da empresa e metas por unidade**.

Período oficial: mês/ano.

Não será permitido criar duas metas consolidadas para o mesmo período nem duas metas da mesma unidade para o mesmo período.

### 1.6 Eventos

Eventos pertencem à empresa e podem ser:

- corporativos, sem unidade;
- vinculados a uma unidade.

Também poderão ocorrer em local externo; nesse caso o local do evento será armazenado nos próprios dados do evento.

### 1.7 Configurações

Os escopos oficiais serão:

- **global:** somente valores padrão do sistema, preferencialmente definidos pela aplicação;
- **empresa:** regras e dados compartilhados;
- **unidade:** comportamento operacional local;
- **usuário:** preferências pessoais;
- **dispositivo:** preferências locais do navegador/aparelho.

Configurações de dispositivo não serão fonte de verdade comercial, financeira ou de autorização.

### 1.8 Estoque

O estoque oficial é sempre:

**produto + unidade → saldo**

`produtos.estoque_atual` não será fonte oficial na V3.

---

## 2. Estoque e inventário

### 2.1 Combos e composição

A V3 adotará **estratégia de estoque configurável por produto**, com dois modos:

- **COMPONENTES:** baixa os componentes da composição;
- **PROPRIO:** baixa o próprio produto como estoque.

Um produto no modo COMPONENTES não poderá consumir outro produto que também seja composto, evitando composição recursiva.

### 2.2 Saldo negativo

O comportamento padrão será:

- saída acima do saldo = bloqueada;
- exceção administrativa = permitida somente com permissão específica e justificativa;
- toda exceção gera auditoria.

Produtos que não controlam estoque não estão sujeitos a esse bloqueio.

### 2.3 Quantidades fracionadas

Cada produto terá:

- unidade de medida;
- indicador de permissão para quantidade fracionada.

Exemplo: unidade para espetinho/garrafa e kg/l para itens pesáveis ou mensuráveis.

Internamente, o estoque suportará valores decimais.

### 2.4 Combos dentro de combos

**Não serão permitidos na V3.**

A composição de um produto composto deve apontar apenas para produtos que não sejam compostos.

Isso elimina ciclos e simplifica a baixa transacional.

### 2.5 Transferência entre unidades

Transferência será uma operação de duas etapas:

**solicitada/enviada → em trânsito → recebida**

Regras:

- ao enviar, o saldo é retirado da origem;
- o destino só recebe saldo na confirmação do recebimento;
- cancelamento antes do recebimento é permitido com autorização e gera a reversão necessária;
- toda transferência possui origem, destino, responsável, datas e operação;
- aprovação separada não é obrigatória na primeira entrega, mas a permissão para transferir/receber é.

### 2.6 Storage e arquivos

Política:

- imagens de catálogo e materiais públicos de evento podem ser públicas;
- documentos administrativos e financeiros são privados;
- metadados relevantes devem ser rastreáveis;
- nenhum arquivo de negócio será apagado automaticamente apenas por perder a referência;
- limpeza de órfãos será uma rotina administrativa própria;
- backup deverá incluir os arquivos definidos como críticos.

### 2.7 SKU e código de barras

- SKU é opcional;
- código de barras é opcional;
- quando informado, ambos devem ser únicos dentro da empresa;
- um produto poderá possuir vários códigos de barras;
- o código não será específico por unidade na primeira versão.

### 2.8 Inventário

O inventário terá ciclo:

**rascunho → contando → aguardando conclusão → concluído**

Também poderá ser **cancelado** enquanto não concluído.

Regras:

- somente um inventário ativo por unidade;
- o inventário poderá abranger um conjunto definido de produtos;
- a contagem física fica registrada por item;
- a conclusão será transacional;
- o saldo efetivo é protegido no momento da conclusão;
- movimentações ocorridas depois da contagem não serão apagadas nem ignoradas: aparecerão como divergência e deverão ser consideradas pelo operador antes da conclusão;
- após concluído, o inventário não é editado; correções posteriores são novas operações.

---

## 3. Atendimento, mesa e comanda

### 3.1 Identificação de mesa/comanda

A identificação visível da mesa/comanda será **única somente enquanto houver uma sessão ativa na unidade**.

Após o encerramento, o identificador pode ser reutilizado.

O histórico usa o ID interno da sessão, não o número visível.

### 3.2 Ciclo da comanda

Estados oficiais:

**ABERTA → EM_ATENDIMENTO → PRONTA_PARA_FECHAMENTO → FECHADA**

Estados de encerramento alternativos:

- CANCELADA.

Uma comanda fechada não volta silenciosamente para aberta.

### 3.3 Reabertura

“Reabrir” será tratado como **nova sessão de atendimento relacionada à anterior**, preservando a sessão fechada e seus efeitos financeiros.

O identificador visível da mesa/comanda poderá ser reutilizado, mas o registro interno da nova sessão será diferente.

Qualquer reversão financeira necessária será explícita e auditada.

### 3.4 Cancelamento e recusa de item

Recusa na cozinha não cancela automaticamente a cobrança.

Fluxo:

**cozinha recusa → atendimento decide substituição/cancelamento → efeito financeiro correspondente**

Depois que o item for enviado à cozinha, alterações relevantes ficam registradas.

Cancelamento após início do preparo exige a permissão prevista pela política de atendimento.

Nenhum item é apagado fisicamente para desfazer uma operação.

### 3.5 Divisão da conta

A V3 suportará, já na primeira entrega:

- divisão por valor;
- divisão por itens;
- divisão de quantidade de uma linha;
- múltiplas formas de pagamento;
- pagamentos parciais;
- troco no pagamento em dinheiro.

A divisão não cria vendas artificiais apenas para representar participantes.

A venda final só é encerrada quando o valor devido estiver completamente coberto por pagamentos e/ou crédito autorizado.

### 3.6 Permissões do atendimento

Permissões específicas serão separadas para:

- abrir comanda;
- alterar item;
- cancelar item;
- dividir conta;
- reabrir atendimento;
- fechar comanda;
- aplicar desconto;
- estornar;
- encerrar comandas em massa.

Papéis são agrupadores de permissões; a regra não dependerá de um `nivel` numérico gravado no navegador.

### 3.7 Atendimento simultâneo

Múltiplos usuários poderão operar a mesma unidade e, quando permitido, a mesma comanda.

Conflitos de gravação usarão controle de versão/concorrência no serviço e no banco.

A V3 não usará o padrão “ler JSONB → alterar no navegador → sobrescrever tudo”.

Em conflito, a operação será recusada e a UI deverá recarregar o estado oficial.

---

## 4. Vendas, pagamentos e caixa

### 4.1 Venda balcão e caixa

Regra:

- venda com pagamento imediato exige caixa operacional aberto na unidade;
- venda somente em FIADO pode ser concluída sem entrada imediata no caixa;
- venda mista contendo qualquer pagamento imediato exige caixa aberto;
- venda sem caixa aberto não será aceita como “contingência” silenciosa.

### 4.2 Formas de pagamento

Catálogo inicial oficial:

- DINHEIRO;
- PIX;
- CARTAO_CREDITO;
- CARTAO_DEBITO;
- FIADO;
- OUTRO.

A forma OUTRO exige descrição e pode ter configuração própria.

### 4.3 Pagamento dividido

Pagamento dividido será recurso de primeira entrega.

Uma venda pode ter vários registros em `venda_pagamentos`.

A soma dos pagamentos deve fechar o valor devido, respeitando a regra de troco do dinheiro.

### 4.4 Contas a receber

Regras:

- FIADO exige cliente identificado;
- recebimentos podem ser totais ou parciais;
- pagamento acima do saldo será bloqueado na primeira versão;
- uma conta originada em uma unidade poderá ser recebida em outra unidade da mesma empresa;
- criação, alteração e recebimento exigem permissões específicas;
- saldo é derivado dos recebimentos registrados.

### 4.5 Despesas

Regras:

- pagamento parcial é permitido;
- despesa não é apagada depois de lançada;
- depois de paga, os valores financeiros ficam imutáveis;
- correções financeiras usam cancelamento/estorno, não edição silenciosa;
- descrição ou metadados podem ter alteração controlada e auditada;
- despesas corporativas usam unidade nula.

### 4.6 Estorno

A V3 suportará:

- estorno total;
- estorno parcial;
- autorização específica;
- justificativa;
- auditoria;
- operação compensatória.

Regras:

- a venda original nunca é apagada;
- o estorno possui referência explícita à operação original;
- pagamentos e caixa são revertidos por operações compensatórias;
- conta a receber é ajustada por operação própria;
- estoque **não retorna automaticamente** apenas porque uma venda foi estornada;
- retorno físico ao estoque exige operação específica de entrada/devolução quando aplicável;
- estorno fora do período corrente exige permissão administrativa reforçada e motivo.

Não haverá janela fixa obrigatória de dias na primeira versão.

### 4.7 Estorno de venda fiada

Se a conta ainda não tiver recebimentos:

- o saldo em aberto é reduzido/cancelado conforme o valor estornado.

Se já houver recebimentos:

- o histórico dos recebimentos permanece;
- a reversão financeira é uma operação nova e auditada;
- eventual crédito/devolução financeira não será obtido simplesmente alterando `valor_pago`.

### 4.8 Caixa

Na primeira entrega:

- haverá no máximo **um caixa aberto por unidade**;
- abertura registra valor inicial;
- fechamento exige contagem física;
- sistema calcula valor esperado;
- operador informa valor contado;
- diferença fica registrada;
- diferença diferente de zero exige justificativa;
- caixa fechado não é reaberto;
- correções posteriores usam ajustes/estornos.

Conferência por segundo usuário poderá ser adicionada depois, mas não será obrigatória no primeiro release.

### 4.9 Pagamentos digitais e caixa

PIX, cartão e demais pagamentos imediatos ficam vinculados à sessão de caixa para efeito de reconciliação, mesmo quando não representam dinheiro físico.

FIADO não gera entrada no caixa no momento da venda.

### 4.10 Turno local

Encerramento de turno do dispositivo continua sendo apenas limpeza de contexto local.

Nunca fecha ou altera o estado do caixa no servidor.

### 4.11 Conciliação de caixa

O fechamento registrará:

- valor inicial;
- entradas;
- saídas;
- valor esperado;
- valor contado;
- diferença;
- justificativa, quando necessária;
- usuário;
- data/hora.

---

## 5. Eventos, mesas e reservas

### 5.1 Ciclo do evento

Estados oficiais:

**RASCUNHO → PUBLICADO → EM_OPERACAO → ENCERRADO**

Estado alternativo:

- CANCELADO.

Regra:

- RASCUNHO não é público;
- PUBLICADO permite divulgação e venda/reserva conforme configurado;
- EM_OPERACAO representa a execução;
- ENCERRADO finaliza a operação;
- CANCELADO preserva todo o histórico.

### 5.2 Mesas do evento

Cada mesa será uma entidade própria em `evento_mesas`.

A posição gráfica será suportada de forma opcional.

Número da mesa é único dentro do evento.

### 5.3 Reservas

Estados oficiais:

- PENDENTE;
- CONFIRMADA;
- CANCELADA;
- EXPIRADA.

Tipos estruturados:

- RESERVA;
- CORTESIA;
- BLOQUEIO.

Preço da reserva é congelado no momento da confirmação.

### 5.4 Retenção de reserva pendente

Para solicitações públicas com pagamento/confirmacão pendente:

- prazo padrão de retenção = **30 minutos**;
- o evento poderá configurar outro prazo;
- após o prazo, a reserva expira automaticamente;
- reserva manual feita pela equipe pode ser confirmada diretamente quando permitido.

### 5.5 Preço de mesa

Evento poderá possuir:

- preço padrão da reserva;
- valor específico por mesa;
- valor promocional/especial por reserva.

O valor efetivamente aplicado é congelado na reserva.

### 5.6 Cliente na reserva

Reserva confirmada exige identificação do cliente.

Uma solicitação pública pendente poderá começar apenas com os dados mínimos de contato, mantendo snapshot para rastreabilidade até a confirmação.

### 5.7 Mapa de mesas

A posição gráfica da mesa será suportada na V3.

A disponibilidade oficial, entretanto, será derivada das relações de reserva, e não do desenho.

---

## 6. Ingressos

### 6.1 Modelo tipo + lote

A V3 adotará **tipo de ingresso + lote**.

O lote é a unidade vendável que controla:

- preço;
- limite;
- início de vendas;
- fim de vendas;
- status.

Isso permite primeiro lote, segundo lote, meia-entrada, lote promocional etc., sem duplicar regras.

### 6.2 Janela de venda

Cada lote possui janela de venda própria.

Fora da janela, novas emissões são bloqueadas, salvo permissão administrativa explícita para operação interna.

### 6.3 Limites

A V3 controlará:

- limite do lote;
- limite geral do evento, quando configurado;
- capacidade operacional do evento, quando aplicável.

A emissão é protegida por transação e não confia em contador armazenado no navegador.

### 6.4 Solicitação pública

A solicitação pública será opcional por evento.

Quando habilitada:

**solicitação → confirmação financeira → emissão**

Solicitação pendente não é ingresso válido.

### 6.5 Pagamento de ingresso — primeira entrega

A primeira entrega trabalhará com **confirmação manual de pagamento**.

A integração automática com gateway de pagamento fica para etapa posterior.

A confirmação manual deve continuar sendo uma operação financeira rastreável.

### 6.6 Caixa em ingressos

Venda de ingresso realizada pelo caixa/atendimento interno exige caixa aberto.

Venda pública com pagamento digital confirmado manualmente **não exige caixa operacional**, mas exige registro financeiro vinculado à venda.

### 6.7 Transferência de ingresso

Será permitida quando o evento habilitar a funcionalidade.

Regras:

- transferência antes do início da operação do evento;
- novo comprador fica registrado;
- histórico do titular anterior permanece;
- código do ingresso continua sendo o mesmo;
- operação é auditada.

### 6.8 Reentrada

Padrão: **não permitida**.

Cada evento poderá habilitar reentrada e definir limite de reentradas.

Cada entrada/reentrada gera histórico em `validacoes_ingresso`.

### 6.9 Cancelamento e estorno de ingresso

Padrão:

- cancelamento permitido até o início da operação do evento;
- após esse marco, somente mediante permissão administrativa;
- ingresso cancelado nunca é apagado;
- efeito financeiro é tratado pelo serviço financeiro;
- capacidade liberada e possibilidade de revenda respeitam o estado do evento/lote e não ocorrem silenciosamente.

Reembolso externo, quando não houver integração com gateway, será uma etapa financeira controlada/manual.

### 6.10 Portarias

A V3 suportará múltiplas portarias/dispositivos.

Cada dispositivo deverá possuir identificação própria.

Primeira entrega:

- validação oficial exige conexão com o banco/serviço;
- não haverá validação offline autônoma;
- falha de conexão deve impedir o consumo definitivo do ingresso, evitando dupla validação local.

Uma contingência offline poderá ser tratada em evolução posterior.

### 6.11 Patrocinadores

No primeiro modelo, patrocinadores terão cadastro reutilizável.

O vínculo com o evento poderá registrar:

- valor/cota;
- posição;
- período;
- material/entrega;
- observações.

Arquivos de material serão associados por Storage quando necessário.

---

## 7. Relatórios e indicadores

### 7.1 Dashboard oficial

O dashboard operacional deve priorizar dados do contexto atual:

- vendas do período;
- ticket médio;
- comandas abertas;
- pedidos em produção;
- status do caixa;
- estoque baixo;
- contas a receber em aberto;
- despesas próximas;
- indicadores do evento ativo, quando aplicável.

O usuário com escopo empresarial poderá visualizar consolidado e detalhado por unidade.

### 7.2 Relatórios do primeiro release

Serão considerados essenciais:

- vendas por período;
- vendas por unidade;
- vendas por produto;
- ranking de produtos;
- vendas por forma de pagamento;
- fechamento e histórico de caixa;
- movimentações de estoque;
- posição de estoque;
- inventários;
- contas a receber e recebimentos;
- despesas e pagamentos;
- DRE gerencial;
- reservas de evento;
- ingressos emitidos;
- ingressos validados;
- resumo financeiro do evento.

### 7.3 Regra de data do fato

Cada relatório define explicitamente a data usada.

Exemplos:

- venda: data de finalização;
- pagamento: data do pagamento;
- recebimento: data do recebimento;
- despesa gerencial: data de competência;
- caixa: data da movimentação;
- estoque: data da movimentação;
- ingresso: emissão, cancelamento ou validação conforme o indicador.

### 7.4 DRE gerencial

A V3 adotará DRE gerencial por **competência**.

Estrutura principal:

**receita bruta  
− descontos/abatimentos  
− estornos  
= receita líquida  
− custo dos produtos vendidos  
− despesas operacionais  
= resultado gerencial**

O custo do produto vendido será calculado a partir do custo congelado no item da venda.

O fluxo de caixa continuará separado da DRE.

### 7.5 Estornos nos indicadores

Estornos aparecem de forma explícita nos relatórios.

Indicadores líquidos usam:

**valor original − estornos**

O evento/data do estorno permanece visível e a relação com a venda original é preservada.

Não haverá alteração silenciosa de períodos históricos.

### 7.6 Escopo de relatórios

Todo relatório relevante deverá permitir, conforme a permissão:

- visão consolidada da empresa;
- visão por unidade;
- filtros de período.

A unidade não será presumida pelo navegador.

### 7.7 Dataset compartilhado

Tela, PDF e Excel devem usar o mesmo dataset/serviço de relatório.

A apresentação não recalcula uma regra financeira diferente da usada no serviço.

Relatórios muito grandes poderão ser processados de forma assíncrona.

---

## 8. Impressão

### 8.1 Princípio

Impressão é efeito posterior e nunca decide se a operação comercial foi concluída.

### 8.2 Histórico

A V3 registrará o histórico de impressão relevante:

- operação de origem;
- tipo de documento;
- dispositivo;
- tentativa;
- sucesso/erro;
- data/hora.

Reimpressão referencia a origem e não cria venda, pagamento, ingresso ou outra operação financeira.

### 8.3 Mecanismo térmico

A arquitetura terá adaptadores.

O navegador/PDF continua sendo o mecanismo de fallback obrigatório.

Para impressora térmica, a V3 privilegiará um **conector local** quando disponível, mantendo RawBT apenas como adaptador de compatibilidade.

A aplicação não ficará funcionalmente dependente de um aplicativo externo específico.

### 8.4 Android e iOS

A camada de impressão será única para a aplicação.

A experiência poderá variar pelo dispositivo, mas o contrato interno será o mesmo.

No iOS, o caminho PDF/sistema de impressão permanecerá como fallback garantido até existir um conector térmico compatível.

### 8.5 Falha de impressão

Falha de impressão nunca desfaz:

- venda;
- pagamento;
- fechamento de comanda;
- emissão de ingresso;
- movimentação de estoque.

O usuário poderá reimprimir posteriormente a partir da operação concluída.

---

## 9. Resumo do fechamento

Com este ADR ficam fechadas as decisões de negócio que impediam a consolidação do modelo.

Principais consequências de modelagem:

- preço padrão + sobrescrita por unidade;
- clientes e fornecedores por empresa;
- despesas e eventos com unidade opcional;
- metas consolidadas e por unidade;
- estoque por produto/unidade;
- composição sem ciclos;
- transferências em trânsito;
- inventário transacional;
- comanda como sessão interna, com identificador visível reutilizável;
- pagamentos múltiplos;
- contas a receber com recebimentos próprios;
- despesas com pagamentos próprios;
- estorno compensatório;
- um caixa aberto por unidade;
- eventos com mesas e reservas relacionais;
- ingressos por tipo + lote;
- solicitações públicas opcionais;
- validação online na primeira entrega;
- reentrada e transferência configuráveis por evento;
- relatórios por competência/fato;
- impressão desacoplada e auditável.

## Regra de implementação

Estas decisões agora podem ser usadas como base para:

1. revisão do modelo funcional;
2. revisão do modelo relacional;
3. revisão dos contratos dos serviços;
4. consolidação das regras de negócio;
5. fechamento do SQL físico V3.

O banco V3 continua sem criação física nesta etapa.


## Addendum — mesa no atendimento comum

Para evitar ambiguidade entre mesa de atendimento e mesa de evento, fica registrado:

- a primeira entrega da V3 **não terá cadastro formal de mesas no atendimento comum**;
- a mesa/comanda comum será um identificador visível da sessão de atendimento;
- esse identificador precisa ser único enquanto a sessão estiver ativa na unidade;
- após o fechamento, o identificador poderá ser reutilizado;
- mesas de evento são diferentes e continuam representadas por EVENTO_MESAS.

## Addendum — pontos estruturais decorrentes

Também ficam consolidados como consequências do ADR-004:

- produto pode possuir vários códigos de barras;
- ingresso usa TIPO + LOTE;
- transferência de ingresso possui histórico próprio;
- evento suporta múltiplas portarias/dispositivos;
- impressão possui histórico próprio;
- arquivos possuem metadados rastreáveis;
- recebimento de conta pode ocorrer em unidade diferente da unidade de origem.

Esses pontos devem aparecer no modelo relacional final e no SQL definitivo.
