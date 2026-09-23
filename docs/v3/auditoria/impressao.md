# Auditoria do subsistema de impressão

## Estado atual

A impressão está organizada em componentes compartilhados:

- `print-core.js` — motor e configuração;
- `print-cupons.js` — cupons e fichas;
- `print-comprovantes.js` — comprovantes;
- `print-relatorios.js` — relatórios e documentos A4.

## Capacidades encontradas

- bobina de 58 mm;
- bobina de 80 mm;
- layouts configuráveis;
- impressão em iframe oculto;
- geração de conteúdo HTML para impressão;
- relatórios e documentos em formato de impressão/PDF;
- tickets de cozinha;
- impressão de ingressos;
- materiais de eventos;
- reimpressão.

## Integração Android / RawBT

`print-core.js` detecta Android pelo user agent e possui modo específico para RawBT. Quando esse modo está ativo, o sistema monta uma URI `intent:` com esquema `rawbt` e envia o conteúdo para o aplicativo.

Quando esse caminho não é usado, o sistema volta para a impressão normal do navegador por meio de iframe e `window.print()`.

Isso cria dois caminhos técnicos distintos: impressão direta via integração externa no Android e diálogo de impressão do navegador nos demais cenários.

## Pontos de atenção

- a impressão está acoplada ao navegador e ao ambiente do dispositivo;
- preferências de tamanho e modo ficam no `localStorage`;
- o caminho RawBT depende de aplicativo externo no Android;
- o fluxo de navegador depende do suporte de impressão do dispositivo/sistema operacional;
- alterações no motor central podem afetar vendas, cozinha, caixa, eventos e ingressos;
- conteúdos HTML usados em impressão precisam de tratamento consistente de dados dinâmicos.

## Direção para a V3

A impressão deve ser tratada como uma infraestrutura própria, com uma interface estável para os módulos de negócio.

Uma abstração futura pode ser:

`Documento` → `estratégia de saída` → `impressão local`, `PDF`, `integração térmica` ou outro conector.

Assim, a regra de negócio deixa de depender diretamente de RawBT, iframe ou detalhes do navegador.

## Requisito de compatibilidade

Durante a migração, os formatos e fluxos existentes precisam continuar disponíveis. A troca do mecanismo de impressão não deve ser acoplada à reescrita de vendas ou cozinha.