# Log de Integridade e Histórico de Esquema do Banco de Dados

Registro de migrações e atualizações estruturais do banco de dados (PostgreSQL/SQLite) do **Projeto Base**.

---

### [24/09/2026] - Criação Inicial do Esquema de Usuários e Autenticação
- **Tabelas Criadas:**
  - `users`: Armazena os usuários do sistema com criptografia Argon2id + Pepper.
  - `invites`: Gerenciamento de convites com tempo de expiração e role.
  - `password_reset_tokens`: Tokens seguros para redefinição de senha com validade de 24h.
  - `registration_verifications`: Verificação OTP de 6 dígitos via Brevo API para validação de e-mail.

---

### [24/09/2026] - Sistema de Backup Automático e Histórico (Backblaze B2 / S3)
- **Tabelas Criadas:**
  - `backup_schedules`: Armazena a rotina de agendamento automático de backups (`is_active`, `frequency`, `destination_folder`, `retention_max`, `last_run_at`, `next_run_at`, `updated_at`).
  - `backup_histories`: Histórico de dumps gerados, baixados, restaurados e importados (`filename`, `s3_key`, `file_size_bytes`, `backup_type`, `status`, `error_message`, `created_at`).
- **Script de Migração:** `backend/scripts/migrate_backup_tables.py`

---

### [15/10/2026] - Módulo de Gateways de Pagamento e Split de Recebíveis (Fase 1)
- **Tabelas Criadas:**
  - `gateway_settings`: Armazena credenciais e status de cada gateway de pagamento (`gateway_name`, `is_active`, `environment`, `api_key`, `public_key`, `webhook_secret`, `merchant_id`, `created_at`, `updated_at`).
  - `split_recipients`: Gerencia os parceiros recebedores da divisão de pagamentos (`name`, `email`, `document`, `pix_key`, `pix_key_type`, `crypto_wallet`, `crypto_network`, `external_recipient_id`, `default_percentage`, `is_active`, `created_at`, `updated_at`).
- **Script de Migração:** `backend/scripts/migrate_gateway_tables.py`

---

### [15/10/2026] - Gestão de Produtos, Ofertas e Regras de Split por Produto (Fase 2)
- **Tabelas Criadas:**
  - `products`: Catálogo de produtos/ofertas disponíveis para venda no checkout (`name`, `slug`, `description`, `image_url`, `price_brl`, `price_usd`, `is_active`, `payment_methods`, `created_at`, `updated_at`).
  - `product_split_rules`: Regras de divisão de split associadas ao produto (`product_id`, `recipient_id`, `percentage`, `created_at`, `updated_at`).
- **Script de Migração:** `backend/scripts/migrate_product_tables.py`

---

### [15/10/2026] - Múltiplas Ofertas por Produto (Fase 2.5)
- **Tabelas Criadas:**
  - `product_offers`: Suporte a múltiplos valores/ofertas para o mesmo produto (`product_id`, `name`, `slug`, `price_brl`, `price_usd`, `is_active`, `is_default`, `created_at`, `updated_at`).
  - Cada oferta possui seu próprio identificador público único (`/pay/{slug}`).
- **Script de Migração:** `backend/scripts/migrate_product_offers.py`

---

### [15/10/2026] - Configuração de Exigência Opcional de CPF por Produto
- **Tabela Alterada:** `products`
  - Nova Coluna: `require_cpf BOOLEAN NOT NULL DEFAULT FALSE` (permite desativar a exigência de CPF no formulário de checkout).
- **Script de Migração:** `backend/scripts/add_require_cpf_to_products.py`

---

### [15/10/2026] - Motor de Pagamentos: Tabelas de Pedidos e Split de Transações (Fase 3)
- **Tabelas Criadas:**
  - `orders`: Registro de transações do checkout (`order_code`, `product_id`, `offer_id`, `customer_name`, `customer_email`, `customer_phone`, `customer_cpf`, `amount_brl`, `amount_usd`, `payment_method`, `status`, `gateway_name`, `external_transaction_id`, `qr_code_base64`, `qr_code_text`, `expires_at`, `paid_at`).
  - `order_splits`: Armazena a divisão financeira entre os sócios na transação (`order_id`, `recipient_id`, `recipient_name`, `percentage`, `amount_brl`).
- **Script de Migração:** `backend/scripts/migrate_order_tables.py`

---

### [15/10/2026] - Suporte a Pagamento Cripto em Pedidos (Fase 3.3)
- **Tabela Alterada:** `orders`
  - Novas Colunas: `crypto_currency VARCHAR NULL`, `crypto_amount FLOAT NULL` (armazenam a moeda cripto selecionada como USDT, USDC, BTC, ETH e o valor exato cotado).
- **Script de Migração:** `backend/scripts/add_crypto_fields_to_orders.py`

---

### [15/10/2026] - Webhooks de Saída (Outbound Webhooks) por Produto e Logs de Disparo (Fase 3.6)
- **Tabelas Criadas:**
  - `product_webhooks`: Armazena URLs receptoras de webhooks cadastradas por produto (`product_id`, `url`, `events`, `secret_key`, `is_active`, `created_at`, `updated_at`).
  - `webhook_dispatch_logs`: Registro histórico de todas as tentativas de envio com status HTTP retornado (`product_id`, `webhook_id`, `order_id`, `event`, `url`, `payload`, `response_status_code`, `response_body`, `success`, `error_message`, `dispatched_at`).
- **Script de Migração:** `backend/scripts/migrate_webhook_tables.py`

---

### [15/10/2026] - Identificação/Nome Amigável em Webhooks de Saída (Fase 3.6.1)
- **Tabela Alterada:** `product_webhooks`
  - Nova Coluna: `name VARCHAR(100) NULL` (permite nomear ou identificar a finalidade do webhook, como "n8n Principal", "Make", "Área de Membros").
- **Script de Migração:** `backend/scripts/add_name_to_product_webhooks.py`

---

### [16/10/2026] - Funil de Vendas: Pixel Granular, Order Bumps e UpSell (Fase 4.2)
- **Tabela Alterada:** `products`
  - Novas Colunas: `pixel_purchase_active BOOLEAN DEFAULT TRUE`, `pixel_initiate_active BOOLEAN DEFAULT TRUE`, `pixel_pageview_active BOOLEAN DEFAULT TRUE`.
- **Tabelas Criadas:**
  - `product_order_bumps`: Itens complementares oferecidos no checkout com 1-clique (`product_id`, `title`, `description`, `price_brl`, `is_active`, `created_at`, `updated_at`).
  - `product_upsells`: Ofertas exclusivas de UpSell exibidas pós-compra (`product_id`, `title`, `subtitle`, `description`, `price_brl`, `image_url`, `video_url`, `is_active`, `created_at`, `updated_at`).
- **Script de Migração:** `backend/scripts/migrate_funnel_features.py`

---

### [16/10/2026] - UpSell: Link de Página de Vendas Externa (Fase 4.3)
- **Tabela Alterada:** `product_upsells`
  - Nova Coluna: `external_url VARCHAR(500) NULL` (permite cadastrar a URL da página de vendas externa do UpSell para redirecionamento direto pós-compra).
- **Script de Migração:** `backend/scripts/add_external_url_to_upsells.py`

---

### [16/10/2026] - Personalização Visual do Checkout por Expert (Fase 4.4)
- **Tabela Alterada:** `products`
  - Novas Colunas:
    - `primary_color VARCHAR(30) NOT NULL DEFAULT '#0284c7'`: Cor de destaque da marca do expert para botões, bordas e destaques no checkout.
    - `logo_url VARCHAR(500) NULL`: URL do logotipo personalizado do expert ou marca exibido no topo do checkout.
- **Script de Migração:** `backend/scripts/add_appearance_to_products.py`

---

### [16/10/2026] - Elementos de Alta Conversão no Checkout: Cronômetro de Escassez e Depoimentos (Fase 4.5)
- **Tabela Alterada:** `products`
  - Novas Colunas:
    - `timer_enabled BOOLEAN NOT NULL DEFAULT FALSE`: Ativa ou desativa a barra de cronômetro de escassez no checkout.
    - `timer_minutes INTEGER NOT NULL DEFAULT 15`: Tempo limite configurável em minutos para a contagem regressiva.
    - `timer_text VARCHAR(255) NOT NULL DEFAULT 'Esta oferta especial expira em:'`: Texto persuasivo exibido junto ao cronômetro.
    - `testimonials TEXT NULL`: Lista serializada em JSON contendo depoimentos e prova social (nome, papel/cidade, estrelas, texto e foto).
- **Script de Migração:** `backend/scripts/add_conversion_features_to_products.py`

---

### [16/10/2026] - Checkout e Webhooks: Seletor de DDI de Celular/WhatsApp (Fase 4.6)
- **Tabela Alterada:** `orders`
  - Nova Coluna:
    - `customer_phone_ddi VARCHAR(10) NULL DEFAULT '55'`: Código DDI internacional selecionado pelo comprador (padrão Brasil 55), enviado de forma enriquecida nos webhooks (`phone`, `phone_formatted`, `phone_ddi`).
- **Script de Migração:** `backend/scripts/add_phone_ddi_to_orders.py`

---

### [16/10/2026] - Página de Obrigado Personalizada / Externa (Fase 4.7)
- **Tabela Alterada:** `products`
  - Nova Coluna:
    - `thank_you_url VARCHAR(500) NULL`: URL da página de obrigado personalizada (externa ou redirecionamento pós-compra e pós-upsell).
---

### [16/10/2026] - Sistema de Cupons de Desconto (Fase 5.1)
- **Tabelas Criadas:**
  - `coupons`: Cadastro e gestão de cupons com desconto percentual (`code`, `discount_percent`, `product_id`, `never_expires`, `expires_at`, `max_uses`, `current_uses`, `is_active`, `created_at`, `updated_at`).
- **Tabela Alterada:** `orders`
  - Novas Colunas:
    - `coupon_id INTEGER NULL REFERENCES coupons(id) ON DELETE SET NULL`: Vínculo ao cupom utilizado.
    - `coupon_code VARCHAR(50) NULL`: Código do cupom aplicado na venda.
    - `discount_amount_brl DOUBLE PRECISION DEFAULT 0.0`: Valor em Reais abatido pelo cupom.
    - `discount_amount_usd DOUBLE PRECISION DEFAULT 0.0`: Valor em Dólar abatido pelo cupom.
    - `original_amount_brl DOUBLE PRECISION NULL`: Valor bruto antes do cupom em Reais.
    - `original_amount_usd DOUBLE PRECISION NULL`: Valor bruto antes do cupom em Dólar.
- **Script de Migração:** `backend/scripts/migrate_coupon_tables.py`

---

### [16/10/2026] - Sistema de Captura e Recuperação de Abandono de Checkout (Fase 5.2)
- **Tabelas Criadas:**
  - `abandoned_checkouts`: Armazenamento de leads e carrinhos abandonados no Step 1 do checkout (`product_id`, `offer_id`, `customer_name`, `customer_email`, `customer_phone`, `customer_phone_ddi`, `customer_cpf`, `estimated_amount_brl`, `coupon_code`, `recovery_token`, `status`, `contacted`, `notes`, `created_at`, `updated_at`).
- **Script de Migração:** `backend/scripts/migrate_abandoned_cart_tables.py`

---

### [16/10/2026] - Sistema de Afiliados e Comissões (Fase 6.1)
- **Tabelas Criadas:**
  - `affiliates`: Cadastro de parceiros afiliados (`name`, `email`, `phone`, `document`, `affiliate_code`, `pix_key`, `pix_key_type`, `crypto_wallet`, `default_commission_percent`, `is_active`, `notes`, `created_at`, `updated_at`).
  - `affiliate_product_links`: Vínculos de afiliados com produtos específicos, comissão personalizada e métrica de cliques (`affiliate_id`, `product_id`, `commission_percent`, `custom_ref_code`, `clicks_count`, `is_active`, `created_at`, `updated_at`).
  - `affiliate_commissions`: Extrato financeiro de comissões por venda (`affiliate_id`, `order_id`, `product_id`, `amount_brl`, `amount_usd`, `sale_amount_brl`, `commission_percent`, `status`, `paid_at`, `notes`, `created_at`, `updated_at`).
- **Tabela Alterada:** `orders`
  - Novas Colunas:
    - `affiliate_id INTEGER NULL REFERENCES affiliates(id) ON DELETE SET NULL`: Identificador do afiliado atribuído.
    - `affiliate_code VARCHAR(50) NULL`: Código de indicação utilizado no link.
    - `affiliate_commission_brl DOUBLE PRECISION DEFAULT 0.0`: Valor da comissão em Reais.
    - `affiliate_commission_usd DOUBLE PRECISION DEFAULT 0.0`: Valor da comissão em Dólar.
- **Script de Migração:** `backend/scripts/migrate_affiliate_tables.py`

---

### [16/10/2026] - Sistema de Assinaturas e Cobrança Recorrente (Fase 7.1)
- **Tabelas Criadas:**
  - `subscriptions`: Armazenamento de assinaturas recorrentes com ciclo e gateway (`id`, `subscription_code`, `customer_name`, `customer_email`, `customer_phone`, `customer_phone_ddi`, `customer_document`, `product_id`, `offer_id`, `billing_cycle`, `amount_brl`, `status`, `gateway`, `gateway_subscription_id`, `gateway_plan_id`, `card_last_four`, `card_brand`, `current_cycle`, `start_date`, `next_billing_at`, `canceled_at`, `cancel_reason`, `created_at`, `updated_at`).
  - `subscription_invoices`: Extrato de faturas geradas por ciclo da assinatura (`id`, `subscription_id`, `order_id`, `invoice_code`, `cycle_number`, `amount_brl`, `status`, `due_date`, `paid_at`, `gateway_charge_id`, `notes`, `created_at`).
- **Tabela Alterada:** `product_offers`
  - Novas Colunas:
    - `pricing_type VARCHAR(20) NOT NULL DEFAULT 'one_time'`: Define o tipo de cobrança da oferta ('one_time' para pagamento único ou 'recurring' para assinatura recorrente).
    - `billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'`: Ciclo de faturamento ('monthly', 'quarterly', 'semiannual', 'annual').
- **Script de Migração:** `backend/scripts/migrate_subscription_tables.py`

---

### [16/10/2026] - Rastreamento de Tráfego, Parâmetros UTM e BI (Fase 8.1)
- **Tabelas Alteradas:**
  - `orders`:
    - `utm_source VARCHAR(100) NULL` (Origem do tráfego: ex: google, facebook, instagram)
    - `utm_medium VARCHAR(100) NULL` (Mídia ou formato: ex: cpc, stories, feed, reels)
    - `utm_campaign VARCHAR(150) NULL` (Nome da campanha)
    - `utm_content VARCHAR(150) NULL` (Criativo, anúncio ou variação de conteúdo)
    - `utm_term VARCHAR(100) NULL` (Termo de pesquisa ou público)
    - `src VARCHAR(100) NULL` (Identificador simplificado de origem)
    - `sck VARCHAR(100) NULL` (Parâmetro de checkout/tracking)
    - Índices criados: `idx_orders_utm_source`, `idx_orders_utm_campaign`, `idx_orders_src`.
  - `abandoned_checkouts`:
    - `utm_source VARCHAR(100) NULL`
    - `utm_medium VARCHAR(100) NULL`
    - `utm_campaign VARCHAR(150) NULL`
    - `utm_content VARCHAR(150) NULL`
    - `utm_term VARCHAR(100) NULL`
    - `src VARCHAR(100) NULL`
- **Script de Migração:** `backend/scripts/migrate_utm_order_tables.py`

---

### [16/10/2026] - Co-Produção com Prazo de Contrato / Expiração de Split (Fase 8.2)
- **Tabela Alterada:**
  - `product_split_rules`:
    - `valid_until TIMESTAMP WITH TIME ZONE NULL`: Data limite de expiração do contrato de co-produção/lançamento. Quando vencida, a cota retorna automaticamente ao produtor principal no momento do checkout.
- **Script de Migração:** `backend/scripts/add_valid_until_to_product_split_rules.py`

---

### [16/10/2026] - Pagamento Híbrido: Pix + Cartão e 2 Cartões de Crédito (Fase 8.3)
- **Tabela Alterada:**
  - `orders`:
    - `hybrid_type VARCHAR(30) NULL`: Tipo do pagamento híbrido ('pix_card' ou 'two_cards').
- **Nova Tabela:**
  - `order_payments`:
    - `id SERIAL PRIMARY KEY`
    - `order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE`
    - `part_number INTEGER NOT NULL DEFAULT 1`
    - `payment_method VARCHAR(50) NOT NULL` ('pix', 'credit_card')
    - `amount_brl DOUBLE PRECISION NOT NULL`
    - `installments INTEGER NOT NULL DEFAULT 1`
    - `status VARCHAR(30) NOT NULL DEFAULT 'pending'` ('pending', 'paid', 'failed')
    - `external_transaction_id VARCHAR(150) NULL`
    - `qr_code_base64 TEXT NULL`
    - `qr_code_text TEXT NULL`
    - `card_last_four VARCHAR(10) NULL`
    - `card_brand VARCHAR(30) NULL`
    - `paid_at TIMESTAMP WITH TIME ZONE NULL`
    - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    - Índices criados: `idx_order_payments_order_id`, `idx_order_payments_status`, `idx_order_payments_ext_id`.
- **Script de Migração:** `backend/scripts/migrate_hybrid_payments.py`

---

### [16/10/2026] - Gerador de Link de Negociação Personalizada / Propostas High-Ticket (Fase 8.4)
- **Tabela Criada:** `custom_proposals`
  - `id SERIAL PRIMARY KEY`
  - `proposal_code VARCHAR(50) UNIQUE NOT NULL` (código único da proposta, ex: `PROP-20261016-XXXXXX`)
  - `product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE`
  - `offer_id INTEGER NULL REFERENCES product_offers(id) ON DELETE SET NULL`
  - `title VARCHAR(150) NOT NULL` (título da proposta, ex: "Mentoria Individual - Condição Especial")
  - `description TEXT NULL`
  - `customer_name VARCHAR(150) NOT NULL`
  - `customer_email VARCHAR(150) NOT NULL`
  - `customer_phone VARCHAR(50) NOT NULL`
  - `customer_cpf VARCHAR(30) NULL`
  - `amount_brl DOUBLE PRECISION NOT NULL` (valor negociado em R$)
  - `payment_method_allowed VARCHAR(50) NOT NULL DEFAULT 'all'` (`all`, `pix`, `credit_card`, `hybrid_pix_card`, `hybrid_two_cards`)
  - `custom_pix_amount_brl DOUBLE PRECISION NULL` (valor pré-definido de entrada no Pix em proposta híbrida)
  - `custom_card_amount_brl DOUBLE PRECISION NULL` (valor pré-definido de saldo no Cartão em proposta híbrida)
  - `max_installments INTEGER NOT NULL DEFAULT 12`
  - `closer_name VARCHAR(100) NULL` (nome do closer/consultor responsável)
  - `notes TEXT NULL` (anotações internas da negociação)
  - `status VARCHAR(30) NOT NULL DEFAULT 'active'` (`active`, `paid`, `expired`, `canceled`)
  - `order_id INTEGER NULL REFERENCES orders(id) ON DELETE SET NULL`
  - `expires_at TIMESTAMP WITH TIME ZONE NOT NULL` (data/hora limite de expiração da proposta)
  - `paid_at TIMESTAMP WITH TIME ZONE NULL`
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
  - Índices criados: `ix_custom_proposals_code`, `ix_custom_proposals_status`, `ix_custom_proposals_product_id`.
- **Tabela Alterada:** `orders`
  - Nova Coluna: `proposal_id INTEGER NULL REFERENCES custom_proposals(id) ON DELETE SET NULL`
- **Script de Migração:** `backend/scripts/migrate_custom_proposals.py`

---

### [16/10/2026] - Domínios Personalizados / CNAME Whitelabel por Expert (Fase 8.5)
- **Tabela Alterada:** `products`
  - Nova Coluna: `custom_domain VARCHAR(255) NULL` (armazena o domínio/subdomínio próprio do expert, ex: `pay.meudominio.com.br`).
  - Novo Índice: `ix_products_custom_domain` (índice único para busca ultra-rápida por hostname e garantia de unicidade).
- **Script de Migração:** `backend/scripts/add_custom_domain_to_products.py`

---

### [16/10/2026] - Perfil Financeiro do Usuário e Vínculo de Coprodutores/Afiliados
- **Tabelas Alteradas:**
  - `users`: Adição de colunas financeiras de repasse (`document VARCHAR(30)`, `document_type VARCHAR(10) DEFAULT 'cpf'`, `phone VARCHAR(50)`, `pix_key VARCHAR(100)`, `pix_key_type VARCHAR(20) DEFAULT 'cpf'`, `crypto_wallet VARCHAR(100)`, `crypto_network VARCHAR(50) DEFAULT 'polygon'`, `external_recipient_id VARCHAR(100)`, `updated_at TIMESTAMP`).
  - `split_recipients`: Adição de `user_id INTEGER REFERENCES users(id) ON DELETE SET NULL` e índice `ix_split_recipients_user_id`.
  - `affiliates`: Adição de `user_id INTEGER REFERENCES users(id) ON DELETE SET NULL` e índice `ix_affiliates_user_id`.
- **Script de Migração:** `backend/scripts/add_user_financial_profile.py`

---

### [16/10/2026] - Desconto Automático por Método de Pagamento (Incentivo Pix e Cripto)
- **Tabela Alterada:**
  - `products`:
    - `pix_discount_percent FLOAT DEFAULT 0.0`: Percentual de desconto especial para incentivar pagamentos à vista via Pix.
    - `crypto_discount_percent FLOAT DEFAULT 0.0`: Percentual de desconto especial para pagamentos em Criptomoedas (MetaMask/Web3).
- **Script de Migração:** `backend/scripts/add_product_payment_discounts.py`

---

### [17/10/2026] - Order Bump Vinculado ao Catálogo de Produtos e Ofertas
- **Tabela Alterada:**
  - `product_order_bumps`:
    - `bump_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL`: Vínculo do order bump ao produto real cadastrado no sistema (permitindo venda separada no futuro).
    - `bump_offer_id INTEGER REFERENCES product_offers(id) ON DELETE SET NULL`: Vínculo à oferta de preço específica do produto caso ele possua múltiplos preços cadastrados.
- **Índices Criados:** `idx_order_bumps_bump_product_id`, `idx_order_bumps_bump_offer_id`.
- **Script de Migração:** `backend/scripts/add_bump_product_reference.py`

---

### [17/10/2026] - Reembolso com Registro de Motivo (Reembolso 1-Click)
- **Tabela Alterada:** `orders`
  - `refund_reason VARCHAR(255)`: Motivo do estorno selecionado ou informado pelo administrador (arrependimento, insatisfação, problemas técnicos, duplicidade, etc.).
  - `refunded_at TIMESTAMP`: Data e hora exatas do estorno e reembolso da transação.
- **Script de Migração:** `backend/scripts/add_refund_columns_to_orders.py`

---

### [17/10/2026] - Exit-Intent Popup (Desconto Relâmpago) & Prova Social Ao Vivo
- **Tabela Alterada:** `products`
  - `enable_exit_intent BOOLEAN NOT NULL DEFAULT FALSE`: Ativação do popup de retenção na tentativa de saída da página.
  - `exit_intent_coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL`: Vínculo ao cupom de desconto existente que será aplicado automaticamente com 1-clique no popup.
  - `exit_intent_title VARCHAR(200)`: Título persuasivo exibido no popup de saída.
  - `exit_intent_subtitle VARCHAR(255)`: Subtítulo com copy de urgência no popup de saída.
  - `enable_social_proof BOOLEAN NOT NULL DEFAULT FALSE`: Ativação de balões flutuantes de compras recentes no checkout.
  - `social_proof_mode VARCHAR(30) NOT NULL DEFAULT 'hybrid'`: Modo de prova social selecionado pelo produtor (`real` = apenas compras reais, `simulated` = simulação dinâmica realista, `hybrid` = compras reais com preenchimento dinâmico).
- **Script de Migração:** `backend/scripts/add_exit_intent_and_social_proof_to_products.py`

---

### [17/10/2026] - Upsell & Downsell com Catálogo, Tokenização de Cartão e 1-Click Buy
- **Tabelas Alteradas:**
  - `product_upsells`:
    - `upsell_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL`: Vínculo do UpSell a um produto real do catálogo.
    - `upsell_offer_id INTEGER REFERENCES product_offers(id) ON DELETE SET NULL`: Vínculo à oferta de preço específica do UpSell.
    - `enable_downsell BOOLEAN NOT NULL DEFAULT FALSE`: Ativação de oferta de Downsell caso o comprador recuse o UpSell.
    - `downsell_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL`: Vínculo do Downsell a um produto do catálogo.
    - `downsell_offer_id INTEGER REFERENCES product_offers(id) ON DELETE SET NULL`: Vínculo à oferta de preço do Downsell.
    - `downsell_title VARCHAR(255)`: Headline persuasiva do Downsell.
    - `downsell_subtitle VARCHAR(255)`: Subtítulo do Downsell.
    - `downsell_description TEXT`: Descrição detalhada do Downsell.
    - `downsell_price_brl FLOAT DEFAULT 0.0`: Preço exclusivo do Downsell em BRL.
    - `downsell_image_url VARCHAR(500)`: URL da imagem promocional do Downsell.
    - `downsell_video_url VARCHAR(500)`: URL do vídeo de vendas do Downsell.
    - `downsell_external_url VARCHAR(500)`: Link externo opcional para página de Downsell.
  - `orders`:
    - `parent_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL`: Vínculo do pedido filho de UpSell/Downsell ao pedido principal.
    - `order_type VARCHAR(30) NOT NULL DEFAULT 'main'`: Tipo do pedido (`main`, `upsell`, `downsell`).
    - `card_token VARCHAR(255)`: Token do cartão Pagar.me V5 armazenado com segurança para execução de cobranças em 1 clique sem reinserir dados.
- **Índices Criados:** `idx_upsells_upsell_product_id`, `idx_upsells_upsell_offer_id`, `idx_upsells_downsell_product_id`, `idx_upsells_downsell_offer_id`, `idx_orders_parent_order_id`, `idx_orders_order_type`.
- **Script de Migração:** `backend/scripts/add_upsell_downsell_and_card_tokenization.py`

---

### [17/10/2026] - Vídeo de Vendas (Mini-VSL) & Player de Áudio WhatsApp no Topo do Checkout (#13)
- **Tabela Alterada:** `products`
  - `header_media_type VARCHAR(30) NOT NULL DEFAULT 'none'`: Tipo de mídia no topo do checkout (`'none'`, `'video'`, `'audio'`, `'both'`).
  - `header_video_url VARCHAR(500)`: URL do vídeo de vendas / Mini-VSL (YouTube, Vimeo, PandaVideo ou MP4).
  - `header_audio_url VARCHAR(500)`: URL do arquivo de áudio (MP3, AAC, WAV) para o player WhatsApp.
  - `header_audio_author_name VARCHAR(100) DEFAULT 'Mensagem do Especialista'`: Nome do autor/expert exibido no player WhatsApp.
  - `header_audio_author_avatar VARCHAR(500)`: URL da foto/avatar do expert para humanização da nota de voz.
- **Script de Migração:** `backend/scripts/add_header_media_to_products.py`

---

### [17/10/2026] - Sistema Multi-Pixel: Google Ads & TikTok Ads (#17)
- **Tabela Alterada:** `products`
  - `google_ads_id VARCHAR(50) NULL`: ID de Acompanhamento do Google Ads (ex: `AW-123456789` ou `G-XXXXX`).
  - `google_ads_conversion_label VARCHAR(100) NULL`: Rótulo de Conversão do Google Ads para o evento Purchase / Compra (ex: `AbCdEfGhIjKlMnOpQrS`).
  - `tiktok_pixel_id VARCHAR(50) NULL`: ID do Pixel do TikTok Ads (ex: `C1234567890ABCDEFGH`).
- **Script de Migração:** `backend/scripts/add_multi_pixels_to_products.py`

---

### [17/10/2026] - Escudo Anti-Carding, Velocity Check & Blacklist Própria (#10)
- **Tabelas Criadas:**
  - `blacklist_entries`: Gerencia bloqueios de clientes indesejados e fraudadores por CPF, E-mail, Telefone e Endereço IP (`entry_type`, `value`, `reason`, `is_active`, `created_at`, `updated_at`).
  - `card_attempt_logs`: Registra em tempo real as tentativas de pagamento com cartão para cálculo de frequência e velocity check (`ip_address`, `cpf`, `email`, `device_fingerprint`, `order_code`, `status`, `reason`, `created_at`).
  - `security_settings`: Configurações de segurança da conta com threshold padrão de 5 tentativas em 10 minutos (`velocity_threshold`, `velocity_window_minutes`, `auto_blacklist_on_chargeback`, `is_velocity_enabled`, `is_blacklist_enabled`, `updated_at`).
- **Script de Migração:** `backend/scripts/add_security_anti_carding_tables.py`

---

### [17/10/2026] - Teste A/B Nativo de Checkout e Ofertas (Split 50/50) (#18)
- **Tabelas Criadas:**
  - `ab_tests`: Gerenciamento do teste A/B no produto (`product_id`, `name`, `variant_a_offer_id`, `variant_b_offer_id`, `is_active`, `split_ratio`, `visits_a`, `visits_b`, `initiates_a`, `initiates_b`, `conversions_a`, `conversions_b`, `revenue_brl_a`, `revenue_brl_b`, `created_at`, `updated_at`).
- **Tabelas Alteradas:**
  - `orders`: Adicionadas as colunas `ab_test_id INTEGER REFERENCES ab_tests(id) ON DELETE SET NULL` e `ab_test_variant VARCHAR(10) NULL` para atribuição e rastreamento de receita do teste.
  - `abandoned_checkouts`: Adicionadas as colunas `ab_test_id INTEGER NULL` e `ab_test_variant VARCHAR(10) NULL` para análise de abandono por variante.
---

### [18/10/2026] - Regras de Parcelamento no Cartão e Simulador de Split (#4)
- **Tabela Alterada:** `products`
  - `max_installments INTEGER DEFAULT 12`: Limite máximo de parcelas permitidas no cartão (1x a 12x).
  - `free_installments_count INTEGER DEFAULT 1`: Quantidade de parcelas sem juros para o comprador (1x a 12x).
  - `interest_rate_percent FLOAT DEFAULT 2.99`: Taxa de juros ao mês para parcelamento no cartão (padrão de mercado 2.99% a.m.).
  - `interest_payer VARCHAR(20) DEFAULT 'buyer'`: Quem arca com as taxas de parcelamento ('buyer' = comprador paga o acréscimo; 'producer' = produtor absorve a taxa).
- **Script de Migração:** `backend/scripts/add_installment_rules_to_products.py`

---

### [19/10/2026] - Central Rápida do Comprador (/minhas-compras) e Área de Membros (#15)
- **Tabela Alterada:** `products`
  - `member_area_url VARCHAR(500) NULL`: URL direta de acesso à Área de Membros ou entrega do conteúdo do aluno para pedidos pagos.
- **Tabelas Criadas:**
  - `buyer_access_codes`: Armazena códigos temporários OTP de 6 dígitos gerados para autenticação segura do comprador (`email`, `cpf`, `code`, `expires_at`, `is_used`, `created_at`).
- **Script de Migração:** `backend/scripts/add_buyer_portal_and_member_area.py`

---

### [19/10/2026] - Fallback Inteligente de Cartão Recusado (#5)
- **Tabela Alterada:** `products`
  - `enable_card_fallback BOOLEAN DEFAULT TRUE`: Habilita o modal de recuperação instantânea quando um cartão for recusado.
  - `card_fallback_discount_percent FLOAT DEFAULT 0.0`: Percentual de desconto adicional no Pix para salvar a venda no momento da recusa.
- **Script de Migração:** `backend/scripts/add_card_fallback_to_products.py`

---

### [19/10/2026] - Endereço de Cobrança & Antifraude (ViaCEP) (#21)
- **Tabela Alterada:** `products`
  - `require_billing_address BOOLEAN DEFAULT FALSE`: Permite configurar por produto a exigência de endereço de cobrança no cartão/boleto para antifraude.
- **Tabelas Alteradas:** `orders` e `abandoned_checkouts`
  - `billing_zip_code VARCHAR(20) NULL`: CEP informado pelo comprador.
  - `billing_street VARCHAR(255) NULL`: Logradouro (rua/avenida) autocompletado pelo ViaCEP ou informado manualmente.
  - `billing_number VARCHAR(50) NULL`: Número do endereço.
  - `billing_complement VARCHAR(100) NULL`: Complemento (apto, bloco, etc.).
  - `billing_neighborhood VARCHAR(100) NULL`: Bairro autocompletado pelo ViaCEP.
  - `billing_city VARCHAR(100) NULL`: Cidade autocompletada pelo ViaCEP.
  - `billing_state VARCHAR(10) NULL`: Estado / UF (ex: SP, RJ).
- **Script de Migração:** `backend/scripts/add_billing_address_tables.py`

---

### [19/10/2026] - Boleto Parcelado & Pix Parcelado via Asaas (Carnê Digital + Entrada Pix) (#6)
- **Tabela Alterada:** `products`
  - `enable_asaas_installments BOOLEAN DEFAULT FALSE`: Habilita opção de Boleto/Pix Parcelado (Carnê Digital) no checkout.
  - `asaas_max_installments INTEGER DEFAULT 12`: Limite máximo de parcelas permitidas no carnê (até 24x).
  - `asaas_interest_percent FLOAT DEFAULT 0.0`: Taxa de juros/acréscimo mensal no carnê (%).
  - `asaas_require_entry_pix BOOLEAN DEFAULT TRUE`: Exige 1ª parcela paga via Pix imediato para liberação instantânea de acesso.
- **Tabela Alterada:** `split_recipients`
  - `asaas_wallet_id VARCHAR(100) NULL`: ID da carteira Asaas (`walletId`) para divisão automática do split a cada parcela do carnê liquidada.
- **Tabela Alterada:** `orders`
  - `asaas_customer_id VARCHAR(100) NULL`: ID do cliente cadastrado no Asaas (`cus_XXXXXX`).
  - `asaas_installment_id VARCHAR(100) NULL`: ID do carnê/agrupamento de parcelas no Asaas.
- **Tabela Criada:** `order_installments`
  - Armazena individualmente cada parcela do carnê digital com links, código de barras e QR Code Pix:
    - `id SERIAL PRIMARY KEY`
    - `order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
    - `installment_number INTEGER NOT NULL`
    - `total_installments INTEGER NOT NULL`
    - `amount_brl FLOAT NOT NULL`
    - `due_date TIMESTAMP NOT NULL`
    - `status VARCHAR(30) DEFAULT 'pending'` ('pending', 'paid', 'overdue', 'canceled', 'refunded')
    - `payment_method VARCHAR(30) DEFAULT 'boleto'` ('pix', 'boleto', 'boleto_pix')
    - `asaas_payment_id VARCHAR(100) NULL` (ID individual da cobrança no Asaas)
    - `bank_slip_url VARCHAR(500) NULL` (URL do PDF do boleto)
    - `bank_slip_bar_code VARCHAR(150) NULL` (Linha digitável)
    - `qr_code_base64 TEXT NULL` (QR Code Pix embutido no boleto)
    - `qr_code_text TEXT NULL` (Código Copia e Cola Pix da parcela)
    - `paid_at TIMESTAMP NULL`
    - `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    - `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    - Índices: `ix_order_installments_order_id`, `ix_order_installments_asaas_payment_id`, `ix_order_installments_status`.
- **Script de Migração:** `backend/scripts/add_asaas_installments.py`




























