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
