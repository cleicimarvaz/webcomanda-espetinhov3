# Auditoria de integrações e infraestrutura externa

## Supabase

O Supabase é o núcleo de persistência da aplicação. As páginas carregam a biblioteca Supabase JS por CDN e `database.js` inicializa o cliente global `_supabase` usando a configuração central.

`database.js` possui funções auxiliares (`dbFetch`, `dbInsert`, `dbUpdate`, `dbDelete`), mas os demais componentes continuam acessando `_supabase` diretamente em muitos pontos.

Para a V3, a integração deve evoluir para uma camada de serviços/domínio com contratos claros, deixando o detalhe do Supabase fora das telas.

## CDNs e bibliotecas externas

A V2 utiliza recursos externos como:

- Tailwind CSS;
- Lucide;
- Supabase JS;
- ApexCharts;
- SheetJS/XLSX;
- QRCode;
- html5-qrcode;
- fontes web em alguns relatórios.

Essas dependências precisam ser consideradas na estratégia de PWA, principalmente quando a aplicação estiver sem internet.

## QR Code e câmera

Eventos e ingressos utilizam geração de QR Code. O scanner usa `html5-qrcode` para acessar a câmera e consulta o banco para validar o ingresso.

O fluxo de validação evita confiar somente no conteúdo do QR Code: o código é utilizado para localizar o ingresso e o status é conferido no banco.

Na V3, a validação definitiva e a mudança do estado do ingresso devem ficar protegidas por uma operação transacional do servidor, especialmente para impedir duas validações concorrentes do mesmo ingresso.

## GitHub Actions

O backup automático depende do GitHub Actions. O repositório possui um workflow seguro que injeta as credenciais por Secrets.

Há um workflow anterior que não fornece essas variáveis ao script. Ele deve ser tratado como configuração legada e removido ou consolidado antes da operação definitiva do backup.

## Storage

O sistema utiliza Supabase Storage para imagens e backups. O schema atual possui políticas de acesso que devem ser revistas sob a perspectiva de exposição pública, principalmente para arquivos de backup.

## Impressão

A impressão possui integração específica com RawBT/Android e também usa o mecanismo padrão de impressão do navegador.

A V3 deve definir os conectores de impressão como infraestrutura, permitindo trocar o mecanismo sem alterar os módulos comerciais.

## Integrações que merecem contrato formal na V3

- banco de dados;
- Storage;
- autenticação;
- impressão;
- QR Code/scanner;
- backup automático;
- exportações;
- notificações externas/eventos, quando aplicável.

A meta é reduzir dependências implícitas entre código de negócio e infraestrutura externa.