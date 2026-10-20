# 🚀 Roadmap Oficial de Produção: Checkout Próprio (Padrão Kiwify / Hotmart / Cakto / CartPanda)

Este documento consolida todos os módulos necessários para transformar o **Checkout Próprio** em uma máquina de vendas de altíssima conversão, blindada contra quedas de gateway e pronta para escala massiva, organizados rigorosamente por **ordem de prioridade estratégica e retorno financeiro (ROI)**.

---

## 📌 Status Atual do Sistema (O que já está 100% Concluído ✅)

- [x] **Conexão de Gateways & Split:** Pagar.me (Pix e Cartão com split nativo e proporcional) e NOWPayments (Criptomoedas via MetaMask sem KYC).
- [x] **Gestão de Produtos & Ofertas:** Cadastro de produtos, precificação múltipla (`BRL` e `USD`), ofertas secundárias com slugs independentes.
- [x] **Personalização Visual por Expert:** Logotipo da marca, cor primária customizável e capa de produto no checkout.
- [x] **Recursos de Alta Conversão:** Cronômetro de escassez decrescente (com persistência por sessão) e Depoimentos/Prova Social em cards Glassmorphism.
- [x] **Order Bumps Multimoeda:** Ofertas adicionais com toggle em 1 clique e soma automática no total do pedido (em BRL e conversão proporcional em USD/Cripto).
- [x] **UpSell Pós-Compra:** Estrutura pós-compra com suporte a páginas internas ou URL de página de vendas externa.
- [x] **Página de Obrigado Customizada:** Redirecionamento automático pós-compra com repasse de parâmetros (`order_id`, `name`, `email`, `phone`) e Página de Obrigado padrão nativa Clean White (`/thank-you/:orderCode`).
- [x] **Captura de Leads, Abandono de Checkout & Recuperação de Pix (`/recovery`):** Salvamento automático no Step 1 com debounce, disparo do webhook `checkout.abandoned`, painel com métricas de conversão e aba de recuperação de Pix Gerados/Pendentes com cópia de chave e acionamento via WhatsApp.
- [x] **Cupons de Desconto (`/coupons`):** Gestão completa de cupons (percentual, validade, nunca expirar, limite de usos, global ou por produto) e aplicação em tempo real no checkout (BRL e USD/Cripto).
- [x] **Rastreamento Browser (Meta Pixel):** Disparo automático no navegador de `PageView`, `InitiateCheckout` e `Purchase` com valor monetário.
- [x] **Webhooks de Saída Enriquecidos:** Disparos para URLs externas (n8n, Make, ActiveCampaign) com status em português, chave técnica `event_raw`, logs completos e botão de reenvio manual.
- [x] **Seletor Internacional de DDI & Campos Flexíveis:** Dropdown com bandeiras (+55 Brasil padrão), máscara dinâmica e CPF configurável como opcional ou obrigatório por produto (`require_cpf`).
- [x] **Gestão de Logs & Backups Automatizados (S3 + Local):** Monitoramento com filtros por data/tipo em Horário de Brasília e backups com restauração segura.
- [x] **Painel de Vendas, Relatório de Pedidos & BI de UTMs (`/sales`):** Aba "Painel de Vendas & BI" com cards de faturamento bruto/líquido, tabela paginada de pedidos com filtros por data, status, produto e método, modal de detalhes da venda com rateio de split, exportação CSV e BI de UTMs/SRC.
- [x] **Rastreamento Completo de Parâmetros UTM no Checkout & Backend:** Captura e persistência de `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `src` e `sck` nas ordens, carrinhos abandonados e webhooks de saída.
- [x] **Sistema de Afiliados & Comissões (`/affiliates`):** Gestão completa de parceiros, geração de links `/pay/:slug?ref=CODIGO`, rastreamento de cliques, atribuição automática em vendas e extrato de comissões com marcação de repasse.
- [x] **Assinaturas & Cobrança Recorrente (`/subscriptions`):** Cadastro de ofertas recorrentes (mensal, trimestral, semestral, anual), painel com métricas de MRR e assinantes ativos, histórico de faturas e ações de cancelamento/pausa.
- [x] **Co-Produção com Prazo de Contrato (`valid_until`):** Suporte a datas limites em regras de split, expiração automática da cota no momento do checkout e reintegração da porcentagem ao produtor principal.
- [x] **Pagamento Híbrido ("Pix + Cartão" e "2 Cartões de Crédito"):** Divisão flexível entre entrada Pix + parcelamento no Cartão ou entre 2 Cartões de Crédito diferentes, validação transacional estrita de soma, tabela dedicada `order_payments` e interface dinâmica no checkout com recálculo automático em tempo real.
- [x] **Escudo Anti-Carding, Velocity Check & Blacklist Própria (#10):** Limite de tentativas configurável (padrão $\ge$ 5 falhas em 10 min), bloqueio preventivo de robôs testadores de cartão com direcionamento suave ao Pix, auditoria em tempo real e Blacklist centralizada com bloqueio automático em chargebacks.
- [x] **Fallback Inteligente de Cartão Recusado (#5):** Modal instantâneo no checkout acionado em recusas de cartão (HTTP 402 `card_declined`), conversão em 1 clique para Pix com desconto extra configurável por produto (`card_fallback_discount_percent`), transição suave para pagamento híbrido (Pix + Cartão ou 2 Cartões) e limpeza segura de campos para tentar outro cartão preservando dados pessoais.
- [x] **Endereço de Cobrança & Antifraude (ViaCEP) (#21):** Configuração por produto (`require_billing_address`), autocompletar em milissegundos via ViaCEP com fallback no backend, preenchimento dinâmico de rua, bairro, cidade e estado, validação transacional e exibição inteligente exclusiva para pagamentos via Cartão de Crédito e Híbridos (preservando Pix e Cripto rápidos sem atrito).
- [x] **Boleto Parcelado & Pix Parcelado via Asaas (#6):** Carnê Digital com entrada via Pix para aprovação imediata do acesso, parcelamento mensal em até 24x no Asaas com BolePix, split entre cotistas, polling automático e webhooks de controle de parcelas e inadimplência.

---

## 🎯 Ordem Oficial de Prioridade para Produção

---

### 🔴 PRIORIDADE 1: Conversão Imediata, Rastreamento Server-Side & Flexibilidade de Checkout
*(O que coloca dinheiro imediato no bolso, protege as margens e salva vendas no cartão)*

#### #1. Meta Conversions API (CAPI Server-Side)
- **Objetivo:** Impedir que AdBlockers e sistemas iOS 14+ bloqueiem até 30% das marcações de compra no Facebook Ads.
- **Entregáveis:**
  - Campo de **Token da API de Conversões (Meta CAPI)** no cadastro do produto.
  - Disparo **Server-Side** (direto pelo Backend FastAPI para a Graph API da Meta) dos eventos `InitiateCheckout` e `Purchase` com desduplicação (`event_id`) assim que o pagamento é confirmado via webhook.
  - Testes unitários Backend e Frontend.

#### ✅ #2. Link de Checkout Pré-Preenchido + Auto-Cupom via URL (1-Click Lead Checkout) [CONCLUÍDO]
- **Objetivo:** Dobrar a conversão nas vendas de WhatsApp (X1 / Closers) e nos links de recuperação de carrinho abandonado, eliminando a redigitação de dados.
- **Entregáveis Concluídos:**
  - **Leitura Universal de Query Params:** Suporte no checkout para `?name=...&email=...&phone=...&cpf=...&coupon=...&recover=...` com preenchimento instantâneo dos campos e máscara automática de telefone/CPF.
  - **Auto-Aplicação de Cupons:** Validação instantânea do cupom passado na URL com recálculo imediato do total a pagar e feedback visual em toast verde.
  - **Badge de Pré-preenchimento:** Indicador visual verde *"✓ Pré-preenchido"* no cabeçalho do formulário de dados pessoais quando ativado via link.
  - **Integração na Recuperação de Vendas (`/recovery`):** O botão de WhatsApp no painel admin enriquece automaticamente o link com os dados do lead e o cupom de recuperação.
  - **Endpoint de Recuperação por Token:** Rota `/api/v1/recovery/cart-by-token/{token}` pública para carregamento seguro dos dados do carrinho abandonado.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 5 testes em `test_prefilled_checkout_recovery.py` | Frontend Vitest: 5 testes em `usePreFilledCheckout.test.jsx`).

#### #3. Desconto Automático por Método de Pagamento (Incentivo ao Pix e Cripto) [CONCLUÍDO ✅]
- **Objetivo:** Migrar até 30% dos compradores do Cartão para o Pix ou Cripto, garantindo recebimento à vista, taxa menor e risco zero de chargeback.
- **Entregáveis:**
  - Configuração no produto de percentual de desconto exclusivo para **Pix** (`pix_discount_percent`) e/ou **Cripto** (`crypto_discount_percent`).
  - Badge visual de alto impacto nas abas dos métodos de pagamento: `"🔥 X% OFF"` no Pix e `"⚡ Y% OFF"` em Cripto.
  - Recálculo dinâmico em tempo real do resumo do pedido, linha de desconto dedicada e valor a pagar nos botões de finalização.
  - Validação rigorosa no Backend (FastAPI), cobrança do valor líquido com desconto no Pagar.me / NOWPayments e recálculo proporcional automático das cotas de split dos co-produtores.
  - Suíte completa de testes unitários Backend (Pytest) e Frontend (Vitest).

#### #4. Regras de Parcelamento no Cartão + Simulador de Taxas e Lucro Líquido do Split [CONCLUÍDO ✅]
- **Objetivo:** Permitir parcelamento em até 12x protegendo a margem do produtor e dando clareza exata de quanto cada sócio receberá líquido.
- **Entregáveis Concluídos:**
  - Configuração por produto do máximo de parcelas (1x a 12x), parcelas sem juros e repasse de juros ao comprador vs absorção pelo produtor.
  - **Calculadora/Simulador em Tempo Real no Painel:** Tabela dentro da configuração do produto/split mostrando exatamente quanto sobra líquido para cada sócio em vendas no Pix, 1x no Cartão, 6x, 12x no Cartão e Cripto.
  - Suíte completa de testes unitários Backend (Pytest) e Frontend (Vitest).

#### ✅ #5. Fallback Inteligente de Cartão Recusado (Recuperação Instantânea na Tela) [CONCLUÍDO]
- **Objetivo:** Salvar na hora de 15% a 25% das vendas cujo cartão de crédito é negado pelo banco ou por falta de limite.
- **Entregáveis Concluídos:**
  - **Modal Inteligente de Recuperação:** Acionado instantaneamente quando o cartão retorna recusado (`card_declined` / HTTP 402), sem perda de contexto ou recarregamento.
  - **Conversão em 1-Clique para Pix:** Oferta com desconto exclusivo configurável (`card_fallback_discount_percent`), gerando cobrança imediata aproveitando todos os dados preenchidos.
  - **Transição Suave para Pagamento Híbrido:** Opções diretas para alternar para Pix + Cartão ou 2 Cartões de Crédito para contornar limites bancários.
  - **Tentativa com Outro Cartão:** Limpeza focada apenas dos dados do cartão, preservando os dados pessoais do comprador.
  - **Configuração no Painel:** Toggle de ativação e percentual de desconto no modal de conversão do produto.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 5 testes em `test_card_declined_fallback.py` | Frontend Vitest: 13 testes em `CardDeclinedFallbackModal.test.jsx` e `useCardDeclinedFallback.test.js`).

---

### 🟠 PRIORIDADE 2: Novos Meios de Pagamento, Contingência Multi-Gateway & High-Ticket
*(Destravar vendas para clientes sem limite no cartão e blindar a operação contra quedas e fraudes)*

#### ✅ #6. Sistema de Boleto Parcelado & Pix Parcelado via Asaas (Carnê Digital + Entrada Pix) [CONCLUÍDO]
- **Objetivo:** Aumentar em 20% a 35% as vendas de médio e alto ticket (R$ 497 a R$ 10.000) para clientes sem limite no cartão de crédito.
- **Entregáveis Concluídos:**
  - **Integração do Gateway Asaas:** Card dedicado no módulo "Gateways & Split" com suporte a chave de API ($aact_...), ambiente Sandbox/Produção, token de webhook e `asaas_wallet_id` dos recebedores para split automático.
  - **Configuração no Produto:** Habilitação individual no cadastro/edição do produto (`enable_asaas_installments`), limite de parcelas (`asaas_max_installments` até 24x), taxa de juros mensal opcional (`asaas_interest_percent`) e exigência de entrada no Pix (`asaas_require_entry_pix`).
  - **Aba "Boleto Parcelado" no Checkout:** Aba com ícone dedicado e seletor interativo de parcelas com cálculo dinâmico de juros e detalhamento claro do plano (1ª Parcela Entrada Pix + Parcelas Mensais no Carnê).
  - **Tela Pós-Compra de Carnê Digital:** Exibição imediata do QR Code e Pix Copia e Cola para quitação da 1ª parcela de entrada, polling automático de status com liberação instantânea e listagem completa do cronograma de parcelas com link para download/visualização do carnê no Asaas.
  - **Webhooks de Gestão de Inadimplência:** Endpoint `/api/v1/webhooks/asaas` tratando eventos `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE` e `PAYMENT_REFUNDED`, atualizando parcelas na tabela `order_installments` e disparando webhooks externos (`order.paid`, `order.installment_paid`, `order.installment_overdue`).
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 5 testes em `test_asaas_installments.py` | Frontend Vitest: testes em `CheckoutAsaasInstallmentForm.test.jsx`, `ProductAsaasInstallmentFields.test.jsx`, `CheckoutAsaasCarnetPayment.test.jsx` e `CheckoutPaymentMethods.test.jsx`).

#### #7. Contingência Automática Multi-Gateway (Smart Failover / Retentativa Transparente)
- **Objetivo:** Garantir que o checkout nunca perca uma venda se um gateway cair ou recusar um cartão por falso-positivo de antifraude.
- **Entregáveis:**
  - Motor de **Failover Invisível** no Backend: Se uma cobrança de Cartão ou geração de Pix falhar por instabilidade/recusa no Gateway Primário (ex: Pagar.me), o sistema reprocessa automaticamente no mesmo segundo pelo Gateway Secundário (ex: Asaas) sem o comprador perceber.
  - Registro no log do pedido informando qual gateway aprovou a transação após a retentativa.
  - Testes unitários Backend.

#### #8. [CONCLUÍDO] Pagamento Híbrido: "Pix + Cartão" e "2 Cartões de Crédito" (Fatia Limite)
- **Objetivo:** Permitir que o comprador some o saldo que tem no Pix com o restante do limite do cartão, ou use 2 cartões diferentes na mesma compra.
- **Entregáveis:**
  - Opção no checkout para dividir o pagamento em:
    1. **Pix + Cartão:** O cliente escolhe quanto quer dar de entrada no Pix e parcela a diferença no Cartão de Crédito.
    2. **2 Cartões de Crédito:** O cliente define o valor no Cartão 1 e o restante no Cartão 2, com parcelamento independente em cada cartão.
  - Controle transacional unificado: O pedido principal só muda para `Compra Aprovada` quando ambas as partes são confirmadas.
  - Testes unitários Backend e Frontend.

#### ✅ #9. Gerador de "Link de Negociação Personalizada" (Para Closers / Vendas High-Ticket) [CONCLUÍDO]
- **Objetivo:** Permitir que o time comercial feche acordos sob medida no WhatsApp/Zoom mantendo o Split automático dos sócios.
- **Entregáveis:**
  - Tela/Modal **"Gerar Proposta Individual"** no painel admin.
  - Definição rápida de: Produto, Nome/Telefone do Cliente, Valor Fechado, Condição Especial (ex: R$ 1.000 de entrada no Pix + 6x de R$ 400 no Cartão ou Boleto) e Prazo de Expiração do link (ex: 24h).
  - Testes unitários Backend e Frontend.

#### ✅ #10. Escudo Anti-Carding, Velocity Check & Blacklist Própria (Proteção de Conta no Gateway) [CONCLUÍDO]
- **Objetivo:** Impedir que robôs testadores de cartões clonados ("carding") derrubem sua taxa de aprovação ou bloqueiem sua conta no Pagar.me/Asaas.
- **Entregáveis Concluídos:**
  - **Velocity Check:** Bloqueio preventivo automático temporário da opção de cartão se o mesmo IP, CPF ou e-mail tiver 5 tentativas recusadas em menos de 10 minutos (configurável pelo produtor), retornando HTTP 429 e orientando o comprador a concluir o pagamento imediatamente via Pix/Cripto.
  - **Blacklist Centralizada no Painel Admin:** Aba "Escudo de Segurança & Blacklist" no System Hub para bloqueio manual de CPFs, e-mails, telefones e IPs, com busca dinâmica, filtro por tipo, toggle de ativação/desativação e exclusão com modal de confirmação.
  - **Auditoria de Tentativas de Cartão (Logs):** Aba em tempo real registrando o histórico de transações recusadas, bloqueadas pelo escudo ou aprovadas com identificação de IP, e-mail, CPF, 4 últimos dígitos do cartão e bandeira.
  - **Auto-Blacklist em Chargebacks:** Bloqueio preventivo automático instantâneo do CPF, e-mail e telefone do comprador ao receber webhook de estorno/chargeback do gateway.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 5 testes dedicados em `test_anti_carding_security.py` | Frontend Vitest: 5 testes em `SecurityManagement.test.jsx` + 3 testes em `SystemHub.test.jsx`).

---

### 🟡 PRIORIDADE 3: Funil de Lucro Máximo (1-Click Buy), Retenção na Página & Humanização
*(Aumentar o ticket médio por comprador e segurar indecisos dentro do checkout)*

#### ✅ #11. Upsell & Downsell Real em 1 Clique (Tokenização de Cartão + Funil Completo) [CONCLUÍDO]
- **Objetivo:** Fazer o cliente comprar ofertas pós-compra com 1 único clique sem precisar digitar o cartão novamente, e recuperar quem recusa o Upsell.
- **Entregáveis Concluídos:**
  - **One-Click Buy no Cartão:** Armazenamento seguro do `card_token` da compra principal para debitar o Upsell/Downsell instantaneamente em 1 clique sem reinserir dados.
  - **Pix Instantâneo (Opção A):** Modal com QR Code e Copia e Cola automático para compradores de Pix com fallback para cartão.
  - **Vínculo com Catálogo:** Ambos integrados aos produtos e ofertas existentes (`upsell_product_id`, `upsell_offer_id`, `downsell_product_id`, `downsell_offer_id`) com cálculo independente de splits de pagamento.
  - **Fluxo com Downsell:** Compra Principal ➔ **Upsell** ➔ Se clicar em *"Não, obrigado"*, redireciona suavemente para o **Downsell** (oferta mais acessível) ➔ **Página de Obrigado**.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 80 testes | Frontend Vitest: 257 testes).


#### #12. Exit-Intent Popup (Desconto de Última Chance) & Prova Social Ao Vivo
- **Objetivo:** Segurar o visitante indeciso que tenta fechar a aba do checkout e gerar senso de urgência real.
- **Entregáveis:**
  - **Exit-Intent Popup:** Detecção de intenção de saída no Desktop e Mobile, abrindo modal configurável com cupom relâmpago aplicável em 1 clique.
  - **Notificações Ao Vivo:** Balões discretos no canto da tela (*"Gabriel de Curitiba acabou de adquirir via Pix"*) configuráveis por produto.
  - Testes unitários Frontend.

#### ✅ #13. Vídeo de Vendas (Mini-VSL) & Player de Áudio estilo WhatsApp no Topo do Checkout [CONCLUÍDO]
- **Objetivo:** Humanizar o checkout e quebrar objeções finais com a voz ou vídeo do expert.
- **Entregáveis Concluídos:**
  - **Mini-VSL (Vídeo):** Incorporação de vídeo responsivo (YouTube com conversão automática para embed, Vimeo, PandaVideo ou MP4 com player HTML5) no topo do checkout.
  - **Player de Áudio Estilo WhatsApp:** Humanização com nota de voz gravada pelo expert, avatar circular com badge de microfone, botão gradiente de play/pause, barras de ondas sonoras com seek interativo, alternador de velocidade (1x, 1.5x, 2x) e checks azuis.
  - **Configuração no Checkout Builder:** Aba dedicada "Vídeo / Áudio" com alternância de tipo e visualização em tempo real no Live Preview (Desktop & Mobile).
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 84 testes | Frontend Vitest: 270 testes).

#### #14. Notificação "Cha-Ching" em Tempo Real para os Sócios (Alertas de Venda com Cota do Split)
- **Objetivo:** Avisar os sócios em tempo real a cada Pix gerado ou venda aprovada, já informando o lucro individual de cada um.
- **Entregáveis:**
  - Efeito sonoro opcional de "Caixa Registradora" (*Cha-Ching*) no painel admin quando entra uma nova venda.
  - Disparo automático de notificação formatada (via Webhook dedicado para WhatsApp/Telegram) exibindo Produto, Valor Total, Método, UTM de origem e **quanto cada sócio recebeu líquido no Split**.
  - Testes unitários Backend e Frontend.

---

### 🔵 PRIORIDADE 4: Autoatendimento do Aluno, Co-Produção com Prazo, Multi-Tráfego & Testes A/B
*(Reduzir suporte a zero, automatizar contratos de parceiros e escalar tráfego)*

#### ✅ #15. Central Rápida do Comprador (`/minhas-compras` — 2ª Via de Pix/Boleto, Área de Membros e Gestão de Assinatura) [CONCLUÍDO]
- **Objetivo:** Evitar que compradores chamem o suporte para pedir 2ª via de código Pix, links de acesso a membros ou alteração de cartão de assinaturas.
- **Entregáveis Concluídos:**
  - **Portal Público Clean (`/minhas-compras` e `/my-orders`):** Autenticação segura e sem atrito via código temporário OTP de 6 dígitos enviado ao e-mail do comprador (válido por 15 minutos).
  - **Histórico Completo de Pedidos:** Listagem detalhada com status, método de pagamento, data, parcelas e código do pedido.
  - **Área de Membros em 1 Clique:** Botão direto *"Acessar Conteúdo / Área de Membros"* para produtos com URL configurada (`member_area_url`).
  - **2ª Via e Regeneração de Pix:** Modal instantâneo com QR Code dinâmico, código Copia e Cola e contagem regressiva de validade; se o Pix estiver expirado, permite regenerar nova cobrança com 1 clique.
  - **Gestão de Assinaturas e Atualização de Cartão:** Visualização de ciclo, status, próxima cobrança e faturas vinculadas, com modal seguro para atualizar o cartão de crédito da assinatura.
  - **Campo de Área de Membros no Cadastro de Produtos:** Campo `member_area_url` adicionado ao modal de produtos e sincronizado no banco.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 110 testes incluindo `test_buyer_portal.py` | Frontend Vitest: 357 testes incluindo `BuyerPortal.test.jsx`).

#### ✅ #16. Co-Produção com Prazo de Contrato (`valid_until`) [CONCLUÍDO]
- **Objetivo:** Automatizar contratos temporários de co-produção/lançamento no split.
- **Entregáveis Concluídos:**
  - **Expiração Automática de Split (`valid_until`):** Data limite opcional para a cota de um co-produtor no split do produto, retornando a porcentagem ao produtor principal automaticamente após o fim do período.
  - **Interface no Painel:** Campo de data de expiração e indicador visual de contrato expirado no modal de splits do produto.
  - **Testes Unitários:** 100% aprovados (`test_coproduction_split.py`).


#### ✅ #17. Multi-Pixels de Conversão (Google Ads e TikTok Ads) [CONCLUÍDO]
- **Objetivo:** Escalar tráfego pago em múltiplas redes de anúncios além da Meta (Google Ads e TikTok Ads).
- **Entregáveis Concluídos:**
  - **Schema & Banco de Dados:** Adição de `google_ads_id`, `google_ads_conversion_label` e `tiktok_pixel_id` na tabela `products` via script de migração versionado e registrado em `DATABASE_SCHEMA_LOG.md`.
  - **Rastreamento Multi-Pixel Unificado:** Suporte resiliente a AdBlock com inicialização assíncrona (`gtag.js` e `ttq.js`) e disparo automático dos eventos `PageView`, `InitiateCheckout` (com `price`, `quantity`, itens e valor) e `Purchase` (com `send_to: id/label`, transaction_id e `CompletePayment`).
  - **Interface no Painel:** Campos modernos em componente modular `<ProductPixelFields />` no cadastro/edição de produtos e no modal dedicado de Multi-Pixels.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: `test_multi_pixels.py` | Frontend Vitest: `pixelService.test.jsx`, `ProductPixelModal.test.jsx`, `ProductPixelFields.test.jsx`).

#### ✅ #18. Teste A/B Nativo de Checkout e Ofertas (Split Testing 50/50) [CONCLUÍDO]
- **Objetivo:** Descobrir cientificamente qual preço, layout ou configuração gera mais lucro por visitante.
- **Entregáveis Concluídos:**
  - **Schema & Banco de Dados:** Tabela `ab_tests` criada e colunas `ab_test_id` e `ab_test_variant` adicionadas em `orders` e `abandoned_checkouts`, registradas em `DATABASE_SCHEMA_LOG.md`.
  - **Distribuição de Tráfego 50/50:** Roteamento probabilístico persistido no `localStorage` do visitante (`checkout_ab_{id}`) para garantir consistência em visitas recorrentes.
  - **Funil de Conversão & Métricas em Tempo Real:** Rastreamento ponta a ponta (`Visitas` ➔ `InitiateCheckout` ➔ `Pedidos Pagos` e `Faturamento R$`) com cálculo automático de taxa de conversão e badge de variante vencedora (*"🏆 Vencedora"*).
  - **Interface no Painel:** Modal moderno `<ProductABTestModal />` acessível via menu suspenso de ações em `<ProductActionsDropdown />`, com criação rápida de testes, toggle ativo/pausado e confirmação de exclusão.
  - **Recuperação de Carrinho Abandonado:** Associação automática de variantes aos leads capturados no Step 1 do checkout.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: `test_ab_testing.py` | Frontend Vitest: `ProductABTestModal.test.jsx`, `useCheckoutABTest.test.js`).

#### #19. Carteiras Digitais 1-Toque no Mobile (Apple Pay & Google Pay)
- **Objetivo:** Facilitar compras por impulso no celular usando FaceID/biometria sem precisar digitar os números do cartão físico.
- **Entregáveis:**
  - Integração de botão rápido Apple Pay / Google Pay nas abas de pagamento mobile.
  - Testes unitários Frontend.

---

### 🟢 PRIORIDADE 5: Operacional Pós-Venda, Antifraude ViaCEP & Branding Whitelabel
*(Ferramentas de suporte rápido, validação de endereço e autoridade máxima de marca)*

#### #20. Ação de Reembolso Direto no Painel (1-Click Refund)
- **Objetivo:** Estornar vendas dentro do prazo de garantia com 1 clique no painel, sem precisar entrar no gateway.
- **Entregáveis:**
  - Botão **"Reembolsar Venda"** com modal de confirmação seguro, estorno proporcional no split (Pagar.me/Asaas) e disparo do webhook `order.refunded`.
  - Testes unitários Backend e Frontend.

#### ✅ #21. Dados de Antifraude & Endereço de Cobrança para Cartão/Boleto (ViaCEP) [CONCLUÍDO]
- **Objetivo:** Aumentar aprovação de cartão em tickets altos e atender exigências de emissão de boletos registrados.
- **Entregáveis Concluídos:**
  - **Configuração no Painel:** Toggle por produto (`require_billing_address`) integrado ao modal de produto através de `<ProductRequirementFields />`.
  - **Autocompletar Instantâneo (ViaCEP):** Busca assíncrona ao digitar 8 dígitos do CEP com máscara automática e preenchimento de rua, bairro, cidade e UF.
  - **Fallback no Backend:** Endpoint público `/api/v1/checkout/cep/{cep}` garantindo resiliência em caso de falhas de rede/CORS na API direta.
  - **Validação Transacional Rigorosa:** O backend valida a completude do endereço para pagamentos com Cartão de Crédito e Híbridos, preservando o fluxo ultrarrápido sem endereço para Pix e Cripto.
  - **Persistência de Dados:** Colunas dedicadas criadas e migradas em `orders` e `abandoned_checkouts`, registradas no `DATABASE_SCHEMA_LOG.md`.
  - **Testes Unitários:** 100% aprovados (Backend Pytest: 5 testes em `test_billing_address.py` | Frontend Vitest: 18 testes em `viaCepService.test.js`, `useBillingAddress.test.js`, `CheckoutBillingAddress.test.jsx`, `ProductRequirementFields.test.jsx` e `CheckoutBillingAddressIntegration.test.jsx`).

#### #22. Editor Visual de Checkout com Preview Ao Vivo (Checkout Builder)
- **Objetivo:** Visualizar todas as personalizações (cores, logo, áudio, vídeo, bumps, timer) em tempo real lado a lado.
- **Entregáveis:**
  - Painel de edição visual com alternância de preview Desktop e Mobile ao vivo.
  - Testes unitários Frontend.

#### #23. Domínios Personalizados (CNAME Whitelabel por Expert)
- **Objetivo:** Rodar o checkout no domínio próprio de cada produto/expert (`pay.dominioexpert.com.br`).
- **Entregáveis:**
  - Mapeamento de subdomínio via CNAME e resolução dinâmica de rota pelo hostname acessado.

---

## 📋 Tabela Resumo Geral de Status e Prioridades

| Módulo | Tipo | Status Atual |
| :--- | :--- | :---: |
| **Gateways (Pagar.me + NOWPayments) & Split** | Infraestrutura | ✅ Concluído (100%) |
| **Produtos, Múltiplas Ofertas, Order Bumps e UpSell** | Catálogo & Funil | ✅ Concluído (100%) |
| **Personalização Visual por Expert (Logo, Cores, Capas)** | Identidade | ✅ Concluído (100%) |
| **Gatilhos de Conversão (Timer Escassez & Prova Social)** | Conversão | ✅ Concluído (100%) |
| **Página de Obrigado Customizada & Nativa Clean White** | Pós-Venda | ✅ Concluído (100%) |
| **Captura de Leads, Abandono de Checkout & Pix Pendente** | Recuperação | ✅ Concluído (100%) |
| **Cupons de Desconto (Percentual, Validade, Limites, Multimoeda)** | Promoção | ✅ Concluído (100%) |
| **Rastreamento de Tráfego & Parâmetros UTM no Checkout** | Atribuição | ✅ Concluído (100%) |
| **Painel de Vendas, Relatório de Pedidos, Export CSV & BI de UTMs** | Financeiro | ✅ Concluído (100%) |
| **Sistema de Afiliados (Links ?ref, Métricas, Comissões e Split)** | Parcerias | ✅ Concluído (100%) |
| **Assinaturas & Cobrança Recorrente (MRR, Ciclos, Faturas e Ações)** | Recorrência | ✅ Concluído (100%) |
| **#1. Meta Conversions API (CAPI Server-Side)** | Atribuição Blindada | ⏳ **Próximo da Fila** |
| **#2. Link de Checkout Pré-Preenchido + Auto-Cupom via URL** | Conversão X1/Whats | ✅ Concluído (100%) |
| **#3. Desconto Automático por Método (Incentivo Pix/Cripto)** | Margem & Caixa | ✅ Concluído (100%) |
| **#4. Regras de Parcelamento no Cartão + Simulador de Split** | Precificação 12x | ✅ Concluído (100%) |
| **#5. Fallback Inteligente de Cartão Recusado (Modal Pix)** | Recuperação Instantânea | ✅ Concluído (100%) |
| **#6. Boleto Parcelado & Pix Parcelado via Asaas (Entrada + Carnê)** | High-Ticket (+35%) | ✅ Concluído (100%) |
| **#7. Contingência Automática Multi-Gateway (Smart Failover)** | Blindagem de Quedas | ⏳ A Fazer |
| **#8. Pagamento Híbrido: Pix + Cartão e 2 Cartões (Fatia Limite)** | Conversão sem Limite | ✅ Concluído (100%) |
| **#9. Gerador de Link de Negociação Personalizada (Closers)** | Fechamento Comercial | ✅ Concluído (100%) |
| **#10. Escudo Anti-Carding, Velocity Check & Blacklist Própria** | Segurança da Conta | ✅ Concluído (100%) |
| **#11. Upsell & Downsell Real em 1 Clique (Tokenização Cartão)** | 1-Click Buy Pós-Venda | ✅ Concluído (100%) |
| **#12. Exit-Intent Popup (Cupom Relâmpago) & Prova Social Ao Vivo** | Retenção de Saída | ✅ Concluído (100%) |
| **#13. Vídeo de Vendas (Mini-VSL) & Áudio WhatsApp no Checkout** | Humanização & Prova | ✅ Concluído (100%) |
| **#14. Notificação "Cha-Ching" em Tempo Real para os Sócios** | Alertas com Split | ⏳ A Fazer |
| **#15. Central Rápida do Comprador (`/minhas-compras` — 2ª Via)** | Redução de Suporte | ✅ Concluído (100%) |
| **#16. Co-Produção com Prazo de Contrato (`valid_until`)** | Contratos Temporários | ✅ Concluído (100%) |
| **#17. Multi-Pixels (Google Ads e TikTok Ads)** | Escala Multi-Rede | ✅ Concluído (100%) |
| **#18. Teste A/B Nativo de Checkout e Ofertas (Split 50/50)** | Otimização de ROI | ✅ Concluído (100%) |
| **#19. Carteiras Digitais 1-Toque Mobile (Apple Pay & Google Pay)** | Mobile 1-Toque | ⏳ A Fazer |
| **#20. Reembolso 1-Click no Painel (com Motivo de Auditoria)** | Pós-Venda Seguro | ✅ Concluído (100%) |
| **#21. Antifraude & Endereço de Cobrança Cartão/Boleto (ViaCEP)** | Aprovação & Boletos | ✅ Concluído (100%) |
| **#22. Editor Visual de Checkout com Preview Ao Vivo** | Builder Visual | ✅ Concluído (100%) |
| **#23. Domínios Personalizados (CNAME Whitelabel)** | Autoridade de Marca | ✅ Concluído (100%) |

---

## 🛠️ Diretrizes de Execução dos Itens

Para cada item da lista que iniciarmos, o protocolo obrigatório permanece:
1. **Modo Rápido como padrão:** Implementação limpa + Testes unitários automatizados (Backend Pytest e Frontend Vitest).
2. **Auditoria Contínua de Limites de Código:** Backend ≤ 1.000 linhas por arquivo | Frontend e CSS ≤ 500 linhas por arquivo.
3. **Integridade de Esquema:** Scripts de migração criados e registrados em `DATABASE_SCHEMA_LOG.md`.
4. **Regras de Negócio:** Consulta e atualização contínua em `BUSINESS_RULES.md`.
