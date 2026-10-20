# Checkout Personalizado

Plataforma completa e robusta de Checkout Próprio de Alta Conversão, com **FastAPI (Backend)**, **React + Vite (Frontend)**, banco de dados **PostgreSQL**, integração de **Backups em Nuvem (Backblaze B2 / S3)** e **Gerenciamento de Logs de Contêineres** orquestrados via **Docker**.

---

## ✨ Principais Funcionalidades

- 🛒 **Motor de Checkout de Alta Conversão**:
  - Checkout público responsivo mobile-first (`/pay/:slug`);
  - Suporte a Pix nativo com split e QR Code, Cartão de Crédito e Criptomoedas (USDT, USDC, BTC, ETH via MetaMask);
  - **Boleto Parcelado & Pix Parcelado via Asaas**: Entrada via Pix para aprovação imediata do acesso + Carnê Digital mensal em até 24x no Asaas;
  - **Pagamento Híbrido**: Opção de entrada via Pix + restante no Cartão de Crédito (em até 12x), ou divisão em 2 Cartões de Crédito com limites independentes;
  - **Fallback Inteligente de Cartão Recusado**: Modal instantâneo em recusas de cartão com oferta de Pix com desconto ou pagamento híbrido sem perda de dados;
  - **Links Pré-Preenchidos & Auto-Cupom**: Suporte a parâmetros de URL (`?name=...&email=...&phone=...&cpf=...&coupon=...`) com aplicação instantânea;
  - **Desconto Automático por Método**: Desconto configurável por produto para incentivo ao Pix e Criptomoedas com badges visuais de destaque;
  - **Endereço de Cobrança com Autocompletar ViaCEP**: Exibição e validação para compras em Cartão e Boletos, com preservação de fluxo rápido no Pix/Cripto;
  - **Testes A/B Nativos de Checkout**: Divisão 50/50 com persistência local e métricas de conversão e faturamento por variante;
  - **Upsell & Downsell em 1 Clique**: Cobrança One-Click no cartão tokenizado e modal instantâneo de Pix pós-compra;
  - **Mini-VSL e Player de Áudio Estilo WhatsApp**: Quebra de objeções e humanização no topo do checkout;
  - Seletor internacional de DDI com detecção de país e máscara telefônica dinâmica;
  - Campos flexíveis com CPF opcional ou obrigatório por produto (`require_cpf`);
  - Elementos de conversão: Barra de cronômetro de escassez persistente, depoimentos/prova social e Exit-Intent Popup de última chance;
  - Order Bumps com seleção em 1 clique e multimoeda (BRL e USD/Cripto);
  - Central do Comprador (`/minhas-compras`) com autenticação por código OTP para 2ª via de Pix e acesso a membros;
  - Funil de UpSell pós-compra (interno ou redirecionamento externo) e Página de Obrigado personalizada Clean White.
- 💼 **Gerador de Links de Negociação Personalizada (High-Ticket / Closers)**:
  - Criação de propostas comerciais sob medida para clientes de WhatsApp, Zoom ou reuniões de fechamento;
  - Definição de valor acordado, parcelamento flexível (1x a 12x), closer responsável e prazo de validade configurável;
  - Banner exclusivo no checkout com contagem regressiva de expiração e bloqueio automático de links expirados;
  - Baixa e vínculo automático ao pedido no momento em que a compra é aprovada;
  - Dashboard analítico de métricas: faturamento fechado, propostas ativas e taxa de conversão dos closers.
- 👥 **Co-Produção com Validade de Contrato (`valid_until`)**:
  - Divisão de faturamento (Split) entre múltiplos sócios e co-produtores com regras percentuais automáticas;
  - Suporte a prazo de vigência contratual (`valid_until`): expiração automática da cota ao término do período, com retorno para a conta do produtor principal;
  - Indicação visual no painel do status do contrato (Ativo vs Expirado).
- 💰 **Painel de Vendas, Relatórios & BI de Tráfego (`/sales`)**:
  - Cards executivos com Faturamento Bruto, Faturamento Líquido (sua cota do split), Total de Vendas e Ticket Médio;
  - Tabela com filtros avançados por período, status, método de pagamento, produto e campanha UTM;
  - Modal detalhado de pedido com linha do tempo, dados do comprador, endereço IP e cotas do split;
  - Exportação de relatórios em CSV com codificação UTF-8 BOM;
  - BI de tráfego agrupado por `utm_source`, `utm_campaign`, `utm_medium`, `utm_term`, `utm_content` e `src`.
- 🤝 **Sistema Completo de Afiliados (`/affiliates`)**:
  - Cadastro de afiliados com código exclusivo e comissão configurável por produto;
  - Rastreamento seguro de links (`/pay/:slug?ref=CODIGO`) via cookie e localStorage;
  - Atribuição automática da comissão na criação da venda e extrato de repasses financeiros.
- 🔁 **Gestão de Assinaturas & Recorrência (`/subscriptions`)**:
  - Ofertas com cobrança recorrente (ciclos Mensal, Trimestral, Semestral e Anual);
  - Painel com métricas de MRR (Monthly Recurring Revenue), assinantes ativos e faturas pagas;
  - Histórico de faturas por ciclo e cancelamento/pausa com registro de motivo.
- 🏷️ **Cupons de Desconto & Recuperação de Abandono (`/coupons` e `/recovery`)**:
  - Cupons percentuais globais ou por produto, com data de expiração ou limite de utilizações;
  - Captura assíncrona de leads no Step 1 do checkout com debounce e disparo de webhook `checkout.abandoned`;
  - Painel de recuperação de carrinhos abandonados e de Pix Gerados/Pendentes com acionamento via WhatsApp.
- 🔗 **Webhooks de Saída Enriquecidos**:
  - Disparos automáticos para n8n, Make e CRMs por produto, com status amigável em português, logs completos e botão de reenvio manual.
- 🔐 **Autenticação Segura JWT**: Sistema de login com Argon2id, perfis (Superadmin, Admin e Usuário) e controle de sessões.
- 💾 **Backup Automático & Manual no S3**: Dumps compactados periódicos, retenção FIFO e restauração segura.
- 🖥️ **Gerenciamento Avançado de Logs**: Visualização em tempo real dos logs dos contêineres Docker no Horário de Brasília com filtros por tipo e data.

---

## 📁 Estrutura de Pastas

```text
Checkout Personalizado/
├── backend/                  # API em Python com FastAPI
│   ├── app/
│   │   ├── api/v1/endpoints/ # Rotas (checkout, proposals, sales, affiliates, etc.)
│   │   ├── core/             # Configurações, segurança, database e logger
│   │   ├── models/           # Modelos SQLAlchemy
│   │   ├── schemas/          # Schemas Pydantic
│   │   ├── services/         # Regras de negócio e integrações de gateways
│   │   └── main.py           # Entrypoint da aplicação
│   ├── tests/                # Testes unitários com pytest
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                 # Interface React + Vite
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis e telas de gestão
│   │   │   ├── checkout/     # Formulários, banners e fluxos de checkout
│   │   │   ├── proposals/    # Gestão de propostas High-Ticket
│   │   │   ├── sales/        # Relatório de vendas e BI
│   │   │   └── Sidebar.jsx   # Menu de navegação lateral
│   │   ├── context/          # ToastContext e autenticação
│   │   ├── styles/           # Folhas de estilo modularizadas
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker/                   # Orquestração de contêineres
    └── docker-compose.yml
```

---

## 🚀 Como Executar com Docker

Para subir todo o ecossistema (PostgreSQL, Backend FastAPI e Frontend Nginx):

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

- **Frontend**: `http://localhost:3003`
- **Backend API**: `http://localhost:8016`
- **Documentação Swagger**: `http://localhost:8016/docs`
- **PostgreSQL**: `localhost:5438`

---

## 🧪 Como Rodar os Testes Unitários

### Frontend (Vitest + React Testing Library)
```bash
cd frontend
npm test -- --run
```

### Backend (Pytest)
```bash
docker compose -f docker/docker-compose.yml exec backend pytest
# ou localmente:
cd backend
pytest
```
