# Contrato do serviço de impressão V3

## Objetivo

Separar a decisão de negócio da tecnologia usada para imprimir.

## Entrada

O serviço recebe um comando de impressão contendo, no mínimo:
- tipo do documento;
- dados do documento;
- layout;
- largura (58/80 mm);
- destino;
- configuração do dispositivo.

## Destinos

- impressão térmica direta quando disponível;
- navegador/caixa de impressão;
- PDF;
- contingência.

## Documentos

- pedido de cozinha;
- venda;
- fechamento de comanda;
- comprovante de recebimento;
- caixa;
- ingresso;
- evento;
- relatório.

## Regra

Uma operação comercial não pode ser considerada concluída somente porque a impressão foi realizada.

A persistência da operação e a impressão possuem estados independentes.

Exemplo:

\`venda concluída → impressão pendente → reimprimir\`

## Compatibilidade

A V3 deve manter suporte a 58 mm e 80 mm.

A escolha do mecanismo de impressão fica fora da regra de negócio.

## PWA

O comando de impressão deve poder ser acionado após reconexão quando uma operação tiver sido concluída e a saída estiver pendente.


## Addendum — Revisão 05

### Estado da impressão

A impressão deve possuir identidade própria de execução, separada da operação comercial.

Fluxo conceitual:

`operação concluída → comando de impressão → enviado → concluído/falhou → reprocessamento`

### Reimpressão

Reimpressão deliberada não cria nova venda, pagamento, ingresso, fechamento ou movimentação financeira.

### Idempotência

O comando deve possuir identificador de operação/documento para distinguir retry de nova solicitação de impressão.

### Adaptadores

A aplicação deve poder alternar entre:

- navegador/PDF;
- impressora térmica;
- adaptador Android;
- adaptador iOS;
- servidor/conector local futuro.

A escolha do adaptador não pertence ao domínio financeiro ou de atendimento.

### Dados de identidade e configuração

Nome da empresa/unidade e identidade do operador devem vir do contexto autorizado. Configurações puramente de dispositivo, como largura 58/80 mm, podem permanecer locais.

### Falhas

Falha na impressão não desfaz a operação que originou o documento.


## ADDENDUM REVISAO 06 — Histórico e reimpressão

O serviço passa a considerar o histórico de impressão como entidade transversal.

Cada tentativa relevante registra:

- operação de origem;
- documento;
- dispositivo;
- adaptador;
- data/hora;
- sucesso ou erro;
- mensagem técnica quando aplicável.

Reimpressão referencia a operação original e não cria nova operação comercial ou financeira.

O navegador/PDF continua como fallback obrigatório. A solução térmica pode usar conector local, com RawBT mantido apenas como adaptador de compatibilidade.
