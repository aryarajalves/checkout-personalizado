# 📋 Plano de Implementação: Checkout Próprio Customizável

Este documento define o roteiro passo a passo para o desenvolvimento do sistema de **Checkout Próprio**, integrando pagamentos tradicionais (Pix e Cartão com Split) e Criptomoedas (Bitcoin, Ethereum, USDC), sem mensalidades fixas e com taxas reduzidas.

---

## 🎯 Visão Geral da Arquitetura

- **Backend:** FastAPI (Python 3.12) + SQLAlchemy + PostgreSQL
- **Frontend:** React + Vite + TailwindCSS / Lucide Icons
- **Gateways Tradicionais:** Pagar.me (Stone) (Pix com taxa reduzida e Cartão com Split nativo para 2+ recebedores)
- **Gateways Cripto:** NOWPayments (BTC, ETH, USDC direto na MetaMask em redes de baixo custo como Polygon/Arbitrum)
- **Ambiente:** Docker (PostgreSQL, Backend FastAPI e Frontend Nginx)

---

## 🚀 Fases de Desenvolvimento

### 📌 Fase 1: Módulo de Conexão de Gateways & Split (Painel Admin)
*Objetivo: Permitir que o administrador configure suas credenciais de pagamento e defina os participantes do split.*

- [x] **1.1. Modelagem do Banco de Dados:**
  - Tabela `gateway_settings`: Armazenar chaves de API (Pagar.me, NOWPayments), segredos de webhook, modo ativo (`sandbox` ou `production`).
  - Tabela `split_recipients`: Cadastro de parceiros/sócios recebedores (nome, CPF/CNPJ, chave Pix, carteira cripto, ID externo do recebedor no gateway).
- [x] **1.2. Endpoints da API (Backend):**
  - `GET /api/v1/gateways`: Listar configurações ativas.
  - `POST /api/v1/gateways`: Criar/atualizar credenciais e alternar Sandbox/Produção.
  - `POST /api/v1/gateways/test-connection`: Testar comunicação direta com a API do gateway.
  - `CRUD /api/v1/split-recipients`: Gerenciar recebedores do split.
- [x] **1.3. Interface no Painel (Frontend):**
  - Nova aba "Gateways & Split" no menu lateral.
  - Cards de configuração para Pagar.me e NOWPayments.
  - Tabela de gerenciamento de recebedores de Split com porcentagens padrão.
- [x] **1.4. Testes Unitários:**
  - Testes de rotas e validações de credenciais no Backend (Pytest) - 100% aprovados.
  - Testes de renderização dos formulários no Frontend (Vitest) - 100% aprovados.

---

### 📌 Fase 2: Gestão de Produtos & Ofertas
*Objetivo: Cadastrar os itens que serão vendidos através do checkout e suas regras financeiras.*

- [x] **2.1. Modelagem do Banco de Dados:**
  - Tabela `products`: Nome, descrição, slug único, imagens, preço base em BRL e/ou USD.
  - Tabela `product_split_rules`: Associação de um produto a 1 ou mais recebedores com % (máximo 100%).
- [x] **2.2. Endpoints da API:**
  - `CRUD /api/v1/products`: Cadastro, edição, exclusão e listagem de produtos.
  - Configuração de regras de split por produto (`GET/PUT /api/v1/products/{id}/split-rules`).
  - Rota pública de consulta da oferta para o checkout (`GET /api/v1/products/public/{slug}`).
- [x] **2.3. Interface no Painel:**
  - Tela de listagem e cadastro de produtos (Aba "Produtos & Ofertas").
  - Modal para definição de split personalizado por oferta com barra de progresso visual (0% a 100%).
  - Modal de criação e edição com sanitização de slug.
  - Modal de confirmação de exclusão dentro do padrão UX.
- [x] **2.4. Testes Unitários:**
  - Validação de produtos e consistência de somatório de split no Backend (Pytest) - 100% aprovados.
  - Testes dos componentes e formulários de produtos no Frontend (Vitest) - 100% aprovados.

---

### 📌 Fase 3: Motor de Pagamentos & Webhooks (Backend Core)
*Objetivo: Executar as cobranças e escutar os callbacks dos gateways para confirmação imediata.*

- [x] **3.1. Serviço Pagar.me & Pix com Split:**
  - Geração de cobrança Pix com QR Code em SVG/Data URI e chave Copia-e-Cola (EMV).
  - Divisão proporcional nativa de split de pagamento entre sócios cadastrados (`charge_processing_fee: true`, `liable: true`).
  - Fallback automático para modo Sandbox/Simulação com geração autônoma de QR Code.
  - Endpoints públicos `/api/v1/checkout/process`, `/orders/{id}/status` e `/orders/{id}/simulate-paid`.
  - Conexão e feedback em tempo real no frontend (`CheckoutPixPayment.jsx`) com polling a cada 3s e transição para confirmação de pagamento.
- [ ] **3.2. Cartão de Crédito com Tokenização:**
  - Processamento de Cartão de Crédito com divisão de split na transação.
- [x] **3.3. Serviço Cripto (NOWPayments):**
  - Criação de fatura cripto (BTC, ETH, USDC em redes de baixa taxa: Polygon, Arbitrum, BSC, Ethereum).
  - Cálculo de cotação em tempo real e geração de endereço/QR Code SVG para depósito na carteira (MetaMask / Trust).
  - Componente dedicado no Frontend (`CheckoutCryptoPayment.jsx`) com alerta de rede, cópia de endereço, polling em tempo real e simulação em Sandbox.
- [x] **3.4. Rota Pública de Webhooks:**
  - `POST /api/v1/webhooks/{gateway}`, `/nowpayments`, `/pagarme`:
    - Validação de assinatura criptográfica da requisição (HMAC-SHA512 para NOWPayments).
    - Idempotência (evita processar ou reconfirmar o mesmo webhook duas vezes).
    - Atualização do status do pedido (`pending`, `paid`, `failed`).
- [x] **3.5. Testes Unitários:**
  - Testes unitários completos do backend (Pytest) para serviços e rotas de checkout, cripto e webhooks - 100% aprovados.
  - Testes unitários do frontend (Vitest) para formulário, polling, tela Pix e tela Cripto - 100% aprovados.

---

### 📌 Fase 4: Página Pública de Checkout (Alta Conversão)
*Objetivo: Interface rápida, mobile-first e transparente para o comprador final.*

- [x] **4.1. Rota Pública:**
  - Acesso via `/pay/:productSlug`.
  - Carregamento instantâneo das informações do produto e oferta.
- [x] **4.2. Formulário de Dados do Cliente:**
  - Nome completo, e-mail, telefone (WhatsApp com máscara) e CPF configurável (`require_cpf`).
  - Validação inline de campos em tempo real.
- [x] **4.3. Abas de Pagamento:**
  - **Aba Pix:** Informações instantâneas, QR Code e Copia e Cola.
  - **Aba Cartão de Crédito:** Campos formatados (número, validade, CVV, parcelamento).
  - **Aba Cripto:** Seletor de moeda (USDT, USDC, BTC, ETH) e rede blockchain.
- [x] **4.4. Tela de Sucesso / Feedback:**
  - Banner dinâmico de confirmação de pedido e tela comemorativa de liberação imediata.
- [x] **4.5. Testes Unitários:**
  - Suíte completa de testes no Vitest (máscaras, validação, troca de abas, renderização e envio) - 100% aprovados.

---

### 📌 Fase 5: Editor Visual / Customizador de Checkout
*Objetivo: Permitir personalizar a aparência da página de pagamento sem encostar em código.*

- [ ] **5.1. Modelagem de Customização:**
  - Tabela `checkout_themes`: Cores primárias, cor de fundo, logotipo, textos de cabeçalho e rodapé.
  - Opções de conversão: Ativar/desativar Timer regressivo de urgência, selos de segurança, depoimentos.
- [ ] **5.2. Interface do Editor (WYSIWYG / Preview):**
  - Painel com controles à esquerda e tela de preview interativa em tempo real à direita.
- [ ] **5.3. Testes Unitários:**
  - Testes do renderizador dinâmico de temas e preview.

---

## 📊 Status do Projeto

| Fase | Descrição | Status |
| :--- | :--- | :--- |
| **Fase 1** | Conexão de Gateways & Split (Painel Admin) | ✅ Concluída (100%) |
| **Fase 2** | Gestão de Produtos, Ofertas, Order Bumps & UpSell | ✅ Concluída (100%) |
| **Fase 3** | Motor de Pagamentos Pix, Cripto & Webhooks | ✅ Concluída (100%) |
| **Fase 4** | Página Pública de Checkout, Aparência & Conversão | ✅ Concluída (100%) |
| **Fase 5** | Cupons, Recuperação de Abandono & Pix Pendente | ✅ Concluída (100%) |
| **Fase 6** | Sistema de Afiliados & Comissões (?ref) | ✅ Concluída (100%) |
| **Fase 7** | Assinaturas, MRR & Cobrança Recorrente | ✅ Concluída (100%) |
| **Fase 8** | Painel de Vendas, Relatórios, Exportação & BI de UTMs | ✅ Concluída (100%) |
| **Próximo** | Meta CAPI Server-Side & Boleto Parcelado (Asaas) | ⏳ Próximas Etapas |


