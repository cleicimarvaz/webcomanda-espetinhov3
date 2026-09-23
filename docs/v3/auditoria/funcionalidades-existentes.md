# Funcionalidades existentes na V2

Este levantamento registra o que já existe na base da V2 que está sendo usada como ponto de partida da V3. O objetivo é evitar recriar funcionalidades e permitir que a evolução seja feita sobre uma base conhecida.

## Operação de vendas
- venda direta no balcão;
- carrinho de produtos;
- categorias e busca;
- complementos;
- produtos com composição/combos;
- cálculo de pagamento e troco;
- venda em comanda/mesa;
- lançamento de itens em comandas existentes;
- fechamento de comanda;
- venda a prazo/conta a receber;
- localização ou criação de cliente no fluxo;
- reimpressão de comprovantes;
- estorno administrativo.

## Comandas e mesas
- abertura de comanda;
- associação com mesa/número;
- inclusão e alteração de itens;
- acompanhamento de comandas abertas e encerradas;
- reabertura de comanda;
- divisão de conta por itens ou valor;
- diferentes formas de pagamento;
- fechamento e impressão.

## Cozinha / produção
- monitoramento dos pedidos;
- identificação de itens destinados à cozinha;
- aceitação, recusa e conclusão de itens;
- atualização automática/contínua do monitor;
- alertas sonoros;
- histórico de produção;
- impressão de tickets;
- fluxo de contingência de impressão.

## Produtos e estoque
- cadastro e edição de produtos;
- categorias;
- preço e histórico de preços;
- controle de estoque;
- estoque mínimo;
- fornecedor;
- foto e galeria de fotos;
- composição de combos;
- movimentação de estoque;
- inventário;
- importação de produtos;
- importação de inventário;
- exportação de inventário;
- ativação/desativação de produtos;
- curva ABC.

## Compras / fornecedores
- cadastro de fornecedores;
- alteração de cadastro;
- ativação/desativação;
- exclusão;
- associação de fornecedor a produtos e despesas.

## Financeiro
- abertura de caixa;
- movimentações de caixa;
- encerramento parcial;
- fechamento definitivo;
- histórico de caixas;
- despesas;
- vencimentos e pagamento de despesas;
- contas a receber;
- fluxo financeiro;
- DRE;
- comparativo financeiro;
- metas de faturamento;
- projeções;
- relatórios financeiros;
- impressão e exportação de relatórios.

## Eventos e ingressos
- cadastro e edição de eventos;
- status do evento;
- capacidade;
- reservas;
- aprovação/liberação/cancelamento de reservas;
- mapa de ocupação e mesas;
- patrocinadores;
- informações financeiras do evento;
- tipos de ingresso;
- venda de ingresso;
- aprovação/cancelamento;
- impressão e reimpressão;
- link público para ingressos;
- QR Code;
- leitura de ingresso por câmera;
- lista e controle de ingressos.

## Cardápio público
- consulta pública de produtos;
- categorias;
- busca;
- visualização de detalhes;
- modos de visualização;
- geração de PDF do cardápio.

## Gestão administrativa
- usuários;
- perfil/nível de usuário;
- ativação/desativação;
- auditoria;
- notificações;
- configurações do sistema;
- configurações de impressão;
- dados da loja;
- tema da interface;
- backup manual;
- backup automático;
- exportação para Excel.

## Relatórios e gestão
A V2 possui dashboard analítico com dados de vendas, comandas, despesas, contas a receber e estoque. Também há relatórios de caixa, financeiro, estoque, produtos, fechamento e eventos.

## Impressão
- bobina 58 mm;
- bobina 80 mm;
- tickets de produção;
- comprovantes;
- relatórios;
- fechamento de caixa;
- ingressos;
- placas e materiais de eventos;
- fluxo RawBT/Android em partes do sistema;
- geração de conteúdo para impressão/PDF.

## PWA
A aplicação possui manifest e Service Worker e pode ser instalada como aplicativo. O comportamento offline atual é principalmente de cache de interface e assets, não de operação transacional offline.

## Funcionalidades que devem ser preservadas durante a V3
A auditoria não encontrou motivo para remover os domínios já consolidados. A estratégia de planejamento é preservar os fluxos existentes e reorganizar a infraestrutura por baixo deles, especialmente em autenticação, autorização, transações, estoque, financeiro, PWA e impressão.

Na implementação futura, cada mudança deverá indicar se é correção, melhoria, reorganização técnica sem mudança funcional ou nova funcionalidade.