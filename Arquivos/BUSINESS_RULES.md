# Regras de Negócio - Checkout Próprio

Este documento é a fonte de verdade para as regras de negócio, limites e definições de comportamento do sistema de Checkout Próprio.

---

## 1. Gateways e Taxas
- **Gateways Suportados:**
  - **Pagar.me:** Para Pix à vista, Cartão de Crédito e Pagamentos Híbridos (2 Cartões / Pix + Cartão) com split nativo.
  - **NOWPayments:** Para pagamentos em Criptomoedas direto na MetaMask sem KYC.
  - **Asaas (Previsto no Roadmap #5):** Para **Boleto Parcelado (Carnê Digital / BolePix)** e **Entrada via Pix + Parcelas no Boleto** com split automático por parcela e controle de inadimplência.
- **Custo Fixo / Mensalidade:** O sistema não deve impor cobranças de mensalidades fixas para o funcionamento dos gateways; apenas tarifas por transação conforme os planos dos gateways configurados.
- **Tarifas de Pix:** Devem priorizar taxas percentuais ou fixas reduzidas (ex: 0,99% ou R$ 0,99).
- **Cartão de Crédito:** Priorizar processamento com taxa total abaixo de 4% no recebimento à vista (D+30).

---

## 2. Split de Pagamento
- **Múltiplos Recebedores:** O sistema deve suportar divisão de pagamento entre 2 ou mais participantes por transação.
- **Divisão Cripto:** O pagamento cripto é recebido de forma unificada para evitar múltiplas taxas de rede para o comprador, com posterior distribuição (Payout) para as carteiras cadastradas dos participantes.
- **Percentual Máximo:** A soma das porcentagens de split atribuídas a uma venda não pode exceder 100%.
- **Unicidade de Participantes no Split:** Um mesmo sócio/recebedor não pode ser adicionado mais de uma vez nas regras de split de um mesmo produto. Cada parceiro cadastrado possui uma cota percentual consolidada única na oferta.
- **Divisão de Taxas de Processamento:** As taxas do gateway (MDR de cartão e taxa fixa/percentual de Pix) são debitadas proporcionalmente de cada participante do split com base na sua cota na venda (no Pagar.me: `charge_processing_fee: true` proporcional para cada recebedor).
- **Estorno e Chargeback:** Em caso de reembolso, estorno ou contestação (chargeback), o débito é distribuído proporcionalmente entre todos os participantes do split de acordo com a porcentagem que cada um recebeu na transação (`liable: true`).
- **Co-Produção com Prazo de Contrato (`valid_until`):**
  - Cada regra de split pode opcionalmente definir uma data limite de expiração (`valid_until`), indicando contratos temporários de lançamento, agências de tráfego ou co-produtores com prazo determinado.
  - Se `valid_until` estiver em branco (`null`), a participação é considerada vitalícia/permanente.
  - No momento do checkout, se `valid_until` estiver no passado (`valid_until < now()`), a cota do co-produtor é considerada expirada.
  - A porcentagem de co-produtores expirados é automaticamente reintegrada ao produtor principal (regra permanente sem prazo de validade ou com a maior cota permanente). Caso não haja outros parceiros ativos, a totalidade da receita permanece na conta principal.
  - O painel exibe visualmente o status do contrato ("Ativo" ou "Contrato Expirado") e a data de término configurada.

---

## 3. Ambientes e Testes (Sandbox vs Produção)
- Todas as integrações devem possuir chave para ambiente Sandbox/Testnet e chave para ambiente Produção, permitindo simulações de compra e webhooks sem custos.

---

## 4. Campos do Formulário de Checkout
- **Exigência de CPF:** O campo de CPF no checkout é configurável individualmente por produto através da propriedade `require_cpf`.
- **Comportamento Padrão de CPF:** Por padrão, `require_cpf` inicia desativado (`False`), permitindo um checkout com menos atrito e maior taxa de conversão sem exibir nem exigir o campo de CPF.
- **Quando Ativado:** Quando o administrador marca "Exigir CPF no checkout" no produto, o campo de CPF é exibido com máscara e validação de dígitos verificadores obrigatória.
- **Telefone / Celular e Seletor de DDI:**
  - O campo de Celular / WhatsApp possui um dropdown integrado para seleção de DDI internacional.
  - O DDI padrão é `55` (Brasil 🇧🇷), com suporte a seleção de países internacionais (Portugal +351, Estados Unidos +1, Espanha +34, etc.).
  - Para o DDI 55, a máscara telefônica `(11) 99999-9999` é aplicada em tempo real. Para outros países, aceita dígitos e caracteres internacionais limpos.

---

## 5. Webhooks de Saída (Outbound Webhooks / Integrações Externas)
- **Escopo de Configuração:** Configurado individualmente **por Produto** (Opção 2). Cada produto pode ter uma ou mais URLs receptoras de webhooks.
- **Eventos Oficiais Suportados:**
  1. `order.approved`: Compra Aprovada (Pix, Cripto ou Cartão liquidado com sucesso).
  2. `order.waiting_payment`: Pix Gerado (Aguardando pagamento pelo comprador).
  3. `order.refunded`: Reembolso / Estorno de Pagamento.
  4. `order.chargeback`: Chargeback / Contestação de compra.
  5. `order.card_declined`: Cartão Recusado / Falha no processamento do cartão.
  6. `order.expired`: Pix Expirado / Tempo limite esgotado sem pagamento.
- **Formato do Payload (Opção C):** JSON unificado com dados do cliente (nome, e-mail, telefone, CPF), pedido (código, valor, método, status), produto (id, nome, slug) e regras de split aplicadas.
  - O campo raiz `"event"` contém o mesmo nome do status amigável em português (ex: `"Compra Aprovada"`, `"Pix Gerado"`, `"Reembolso"`, `"Chargeback"`, `"Cartão Recusado"`, `"Pix Expirado"`), correspondendo exatamente a `order.status`.
  - O campo `"event_raw"` mantém a chave técnica em inglês (ex: `"order.approved"`, `"order.waiting_payment"`) para retrocompatibilidade.
  - No objeto `"customer"`, o telefone é enviado de forma enriquecida para automações (WhatsApp/n8n/Z-API):
    - `"phone"`: número completo no formato internacional com `+` e DDI (ex: `"+5511999999999"`).
    - `"phone_formatted"`: número legível com DDI e máscara (ex: `"+55 (11) 99999-9999"`).
    - `"phone_ddi"`: código DDI do país isolado (ex: `"55"`, `"351"`, `"1"`).
- **Logs e Retentativas (Opção D):** Todo disparo de webhook é registrado em banco de dados (`webhook_dispatch_logs`) com URL, evento, status code HTTP retornado, payload e mensagem de erro, com suporte a reenvio manual via painel em caso de instabilidade externa.

---

## 6. Pixels de Conversão e Rastreamento (Meta / Facebook Pixel)
- **Escopo:** Configurado individualmente **por Produto**. Cada produto pode ter seu identificador de Pixel (`meta_pixel_id`).
- **Eventos Oficiais Disparados:**
  1. `PageView`: Disparado automaticamente ao acessar o checkout (`/pay/:slug`).
  2. `InitiateCheckout`: Disparado quando o comprador inicia o preenchimento ou seleciona uma forma de pagamento.
  3. `Purchase`: Disparado no momento exato em que a compra é confirmada/aprovada (na tela de sucesso/confirmação do Pix, Cripto ou Cartão), enviando `value: amount_brl`, `currency: 'BRL'` e `content_name: product.name`.
- **Estratégia de Execução do Funil:** Implementação em 3 etapas sequenciais:
  1. Configuração de Pixel do Produto (Meta Pixel com PageView, InitiateCheckout e Purchase).
  2. Order Bumps no Checkout (itens adicionais somados ao total).
  3. Tela de UpSell básica pós-compra.

---

## 7. Identidade Visual e Personalização do Checkout por Expert
- **Escopo:** Configurado individualmente **por Produto/Expert**. Cada produto pode ter sua identidade visual própria para refletir a marca do expert.
- **Elementos Personalizáveis:**
  1. **Logotipo da Marca / Expert (`logo_url`):** Exibido de forma proeminente no cabeçalho do checkout (`checkout-navbar`), substituindo ou acompanhando o título padrão com fallback seguro.
  2. **Cor Primária da Marca (`primary_color`):** Cor de destaque aplicada dinamicamente nos botões de ação ("Pagar Agora"), etapas do formulário, bordas de seleção de método de pagamento e badges de oferta (Padrão: `#0284c7`).

---

## 8. Página de Obrigado e Fluxo Pós-Venda
- **Escopo:** Configurado por Produto através do campo opcional `thank_you_url`.
- **Fluxo com UpSell:** Se o produto possuir oferta de UpSell ativa, o comprador é direcionado **obrigatoriamente para a página de UpSell primeiro**. A Página de Obrigado só é exibida **estritamente após** a decisão do comprador no UpSell (aceitando ou recusando).
- **Fluxo sem UpSell:** Se o produto não possuir UpSell ativo, o comprador é direcionado para a Página de Obrigado imediatamente após a aprovação/confirmação do pagamento (Cartão aprovado, Pix liquidado ou transação Cripto confirmada).
- **Página Padrão vs Externa:**
  - **Página de Obrigado Padrão:** Caso o campo `thank_you_url` não seja configurado ou esteja vazio, o sistema apresenta a Página de Obrigado padrão nativa do checkout (`/thank-you/:orderCode`), exibindo resumo completo do pedido, status, detalhes de pagamento e dados do comprador.
  - **Página de Obrigado Externa:** Caso o produtor cadastre uma URL externa em `thank_you_url` (ex: área de membros, grupo VIP, página do expert), o sistema exibe uma tela comemorativa de confirmação com contagem regressiva suave de 3 segundos e botão de redirecionamento imediato, anexando parâmetros do pedido na URL (`?order_id={code}&name={name}&email={email}&phone={phone}`).
  - **Estilo Clean White & Política de E-mail:** A Página de Obrigado padrão adota rigorosamente o padrão estético Clean White Premium unificado com o checkout (fundo `#f8fafc`, card branco com borda suave e badges esmeralda). Por determinação de negócio, o sistema **não** dispara e-mails de acesso ao comprador e as telas pós-compra não exibem avisos de envio de credenciais por e-mail.

---

## 9. Order Bumps e Conversão Multimoeda (Cripto / USD)
- **Precificação Base:** Os Order Bumps são cadastrados e exibidos prioritariamente com valor em Reais (`price_brl`).
- **Conversão Automática em Criptomoeda:** Quando o comprador opta pelo pagamento em Criptomoeda (que opera em Dólar/USDT), o valor de cada Order Bump selecionado é convertido proporcionalmente com base na taxa implícita da oferta (`price_usd / price_brl`).
- **Composição do Total em Dólar:** O `amount_usd` final da ordem reflete a soma do item principal em USD mais a conversão de todos os bumps selecionados (`amount_usd = amount_brl * (base_usd / base_brl)`), garantindo coerência visual e de cobrança tanto no resumo do pedido (`Total a Pagar`), no botão de checkout e na cobrança final da carteira Web3/MetaMask.

---

## 10. Cupons de Desconto
- **Cálculo do Desconto:** O desconto é calculado como uma porcentagem (`discount_percent`, ex: 10%, 20%, 50%) aplicada sobre o valor total do pedido (item principal + order bumps selecionados).
- **Regras de Validade e Expiração:**
  1. **Com Prazo de Validade (`expires_at`):** Data e hora de expiração. Após a data, o cupom é automaticamente recusado.
  2. **Nunca Expirar (`never_expires: true`):** Cupom vitalício sem restrição temporal.
  3. **Limite por Quantidade de Usos (`max_uses`):** Quantidade máxima de compras permitidas com o cupom (ex: primeiros 100 compradores). O sistema incrementa `current_uses` a cada pedido criado/pago. Ao atingir o teto, o cupom é recusado com mensagem amigável ("Limite de utilizações atingido").
- **Escopo do Cupom:** Pode ser associado a um produto específico ou ser de aplicação global (`product_id = null` para qualquer produto da loja).
- **Proporcionalidade nos Splits:** O desconto percentual incide sobre o total da venda, de forma que o rateio das cotas de split entre os sócios continue perfeitamente proporcional ao valor final recebido.
- **Multimoeda (BRL e USD/Cripto):** O percentual de desconto se aplica de forma idêntica sobre o valor em Reais (`amount_brl`) e sobre o valor correspondente em Dólar/Cripto (`amount_usd`).

---

## 11. Sistema de Afiliados
- **Identificação do Afiliado:** Link com parâmetro `?ref=CODIGO_AFILIADO` rastreado e armazenado no navegador (localStorage/cookie) para atribuição segura.
- **Comissão:** Percentual configurado por produto repassado ao afiliado em caso de venda confirmada.
- **Divisão Financeira:** A comissão do afiliado é deduzida e liquidada automaticamente através do split de pagamentos (Pagar.me / carteira Cripto) ou registrada como saldo a pagar.

---

## 12. Captura de Leads, Abandono de Checkout e Recuperação de Pix
- **Captura de Leads no Step 1:** O checkout público captura os dados do comprador (Nome, E-mail, Celular/WhatsApp com DDI e CPF se exigido) de forma assíncrona com debounce de 1,2 segundos assim que o usuário preenche dados válidos.
- **Tabela de Carrinhos Abandonados (`abandoned_checkouts`):** Leads que informam os dados mas não concluem a compra permanecem registrados com status `abandoned` e token único de recuperação. Chamadas repetidas do mesmo lead nas últimas 48h atualizam o carrinho sem gerar duplicatas.
- **Conversão Automática:** Quando um comprador conclui o pedido de um produto para o qual já havia um carrinho abandonado, o status do carrinho é automaticamente atualizado para `converted`.
- **Disparo de Webhooks de Abandono:** O sistema dispara o evento oficial `checkout.abandoned` ("Abandono de Checkout") para todas as URLs de webhook cadastradas no produto, transmitindo dados enriquecidos do lead, telefone com DDI, produto, valor estimado e link de recuperação.
- **Recuperação de Pix Gerado / Pendente:** Todas as ordens geradas via Pix que permanecem aguardando pagamento (`waiting_payment` / `pending`) ficam disponíveis no painel administrativo com cópia instantânea da chave Pix Copia e Cola, QR Code e botão de acionamento de mensagem no WhatsApp.
- **Painel Administrativo (`/recovery`):** Visão centralizada com métricas consolidadas (Total de Abandonos, Total Recuperado, Taxa de Recuperação %, Total Pix Gerado, Pix Pendentes e Valor Pendente em R$) e alternância entre as abas de Carrinhos Abandonados e Pix Gerados/Pendentes.

---

## 13. Assinaturas e Cobrança Recorrente (Subscriptions)
- **Tipo de Cobrança por Oferta:** O produto/oferta pode ser configurado como **Pagamento Único** (`pricing_type: 'one_time'`) ou **Assinatura Recorrente** (`pricing_type: 'recurring'`).
- **Ciclos de Faturamento Suportados:**
  1. `monthly`: Mensal (a cada 30 dias).
  2. `quarterly`: Trimestral (a cada 3 meses).
  3. `semiannual`: Semestral (a cada 6 meses).
  4. `annual`: Anual (a cada 12 meses).
- **Processamento e Gateway:** Cobrança recorrente automatizada via **Pagar.me V5 Subscriptions** através de Cartão de Crédito, com tokenização segura do cartão do comprador.
- **Estrutura de Rastreamento:**
  - Tabela `subscriptions`: Rastreia assinante (`customer_id`/dados), produto, oferta, status (`active`, `canceled`, `past_due`, `paused`), ciclo, valor da mensalidade/período, próximo faturamento (`next_billing_at`) e ID da assinatura no gateway.
  - Tabela `subscription_invoices`: Histórico de faturas geradas a cada ciclo com valor, data de vencimento, status de liquidação e ID do pedido gerado.
- **Split em Assinaturas:** O split de pagamentos entre os sócios/recebedores é herdado das regras do produto e aplicado automaticamente a cada renovação de ciclo.
- **Webhooks de Recorrência Suportados:**
  1. `subscription.created`: Assinatura Criada.
  2. `subscription.renewed`: Assinatura Renovada / Fatura Paga.
  3. `subscription.canceled`: Assinatura Cancelada.
  4. `subscription.payment_failed`: Falha no Pagamento da Assinatura / Cartão Recusado na Renovação.
- **Painel Administrativo:** Tela com indicadores de MRR (Monthly Recurring Revenue), assinantes ativos, taxa de churn/cancelamento e ações para cancelar ou pausar assinaturas.

---

## 14. Painel de Vendas, Relatório de Pedidos & BI de UTMs
- **Rastreamento de Tráfego e Parâmetros UTM:**
  - O checkout público captura e armazena automaticamente os parâmetros de tráfego presentes na URL da oferta (`/pay/:slug?utm_source=...&utm_medium=...&utm_campaign=...&utm_content=...&utm_term=...&src=...&sck=...`).
  - Os parâmetros capturados são salvos no `Order` (e no `AbandonedCheckout` durante a captura de lead no Step 1), permitindo rastrear a origem e eficácia de cada canal de aquisição.
- **Métricas Executivas do Painel de Vendas:**
  - **Faturamento Total:** Soma dos pedidos com status pago (`paid`).
  - **Ticket Médio:** Média de valor por venda aprovada.
  - **Taxa de Conversão / Aprovação Geral:** Percentual de pedidos concluídos com sucesso em relação ao total gerado.
  - **Distribuição por Método de Pagamento:** Volume financeiro e percentual de conversão de Pix, Cartão de Crédito e Criptomoeda.
- **Relatório de Pedidos:**
  - Visão detalhada de transações com filtros por período (data inicial e final), status (`paid`, `pending`, `failed`, `refunded`, `canceled`), método de pagamento, produto e pesquisa textual (código do pedido, nome do cliente, e-mail).
  - Modal de detalhes completos com exibição dos splits de pagamento, comissão de afiliado, cupom aplicado e parâmetros de rastreamento (UTMs e SRC).
  - Exportação dos dados filtrados em formato CSV para conciliação contábil e auditoria financeira.
- **BI de UTMs e Inteligência de Tráfego:**
  - Agrupamento analítico de faturamento, quantidade de pedidos e taxa de conversão por:
    1. **Origem (`utm_source` / `src`):** Ex: facebook, google, instagram, youtube, tiktok, orgânico.
    2. **Campanha (`utm_campaign`):** Identificação da campanha de tráfego pago.
    3. **Mídia (`utm_medium`):** Ex: cpc, stories, feed, reels, bio, email.
    4. **Termo / Conteúdo (`utm_term` / `utm_content`):** Criativos e palavras-chave.

---

## 15. Pagamento Híbrido ("Pix + Cartão" e "2 Cartões de Crédito")
- **Modalidades Disponíveis:**
  1. **Pix + Cartão (`hybrid_pix_card`):** Permite ao comprador pagar uma entrada à vista via Pix e parcelar o valor remanescente em até 12x no Cartão de Crédito.
  2. **2 Cartões de Crédito (`hybrid_two_cards`):** Permite dividir o valor total da compra entre dois cartões de crédito distintos, cada um com parcelamento independente de 1x a 12x, destravando a conversão para clientes com limites parciais.
- **Validação Transacional Estrita:**
  - A soma das fatias (`pix_amount_brl + card_amount_brl` ou `card1_amount_brl + card2_amount_brl`) deve corresponder rigorosamente ao total do pedido (`amount_brl`), sem tolerância para discrepâncias de centavos.
  - Cada fatia deve ter valor estritamente superior a zero.
- **Tabela Desacoplada de Pagamentos (`order_payments`):**
  - Cada fatia é registrada com `part_number`, `payment_method`, `amount_brl`, `installments`, `status`, `card_last_four`, `card_brand` ou chaves de QR Code do Pix.
- **Ciclo de Aprovação e Status:**
  - **Pix + Cartão:** A parcela do cartão é processada primeiro. Com o cartão aprovado, o pedido permanece `pending` e a tela pós-checkout exibe imediatamente o QR Code e código Copia e Cola da entrada via Pix. A liquidação do Pix consolida o pedido como `paid` (`Compra Aprovada`).
  - **2 Cartões:** Ambas as cobranças são processadas. Estando ambas aprovadas, o pedido é concluído imediatamente com status `paid`.

---

## 16. Links de Negociação Personalizada (Para Closers / High-Ticket)
- **Objetivo e Cenário de Uso:** Permite a closers, atendentes comerciais ou ao expert fechar negociações consultivas (WhatsApp, ligações e reuniões Zoom) criando um link com condições e valores sob medida para aquele cliente específico.
- **Campos da Proposta Comercial:**
  - `proposal_code`: Código único de identificação e validação (ex: `PROP-20261016-A1B2C3`).
  - `product_id` e `offer_id` (opcional): Produto base ofertado.
  - `customer_name`, `customer_email`, `customer_phone`: Dados do lead/cliente previamente acordados (preenchimento automático no formulário de checkout).
  - `amount_brl`: Preço especial fechado na negociação (substitui o valor público do produto/oferta).
  - `payment_method_allowed`: Métodos permitidos para esta negociação (`all`, `pix`, `credit_card`, `hybrid_pix_card`, `hybrid_two_cards`).
  - `max_installments`: Limite máximo de parcelas no cartão liberado para a proposta (1x a 12x).
  - `closer_name`: Nome do vendedor/closer responsável pela negociação para fins de comissionamento interno e auditoria.
  - `expires_at`: Data e hora limite para o cliente concluir o pagamento (ex: 24h, 48h ou data customizada).
- **Comportamento no Checkout Público (`?proposal=CODIGO`):**
  - O checkout pré-preenche automaticamente os dados do cliente e renderiza um banner comemorativo no topo da página destacando a proposta exclusiva, o closer responsável e o prazo restante (com contagem regressiva).
  - **Bloqueio de Expiração:** Se o link for acessado após a expiração (`expires_at < now()`), o checkout bloqueia a finalização da transação com aviso amigável informando que as condições especiais expiraram.
- **Baixa e Vínculo ao Pedido:**
  - Ao concluir a compra com sucesso (`paid`), o pedido armazena `proposal_id` e a proposta transiciona automaticamente seu status de `active` para `paid`, desativando a reutilização do link.

---

## 📋 Perguntas em Aberto sobre Regras de Negócio
*(Questões pendentes de alinhamento com o usuário)*

- [x] Como deseja estruturar o modelo de pagamento da recorrência?
  - **Resposta do Usuário:** Pagar.me V5 (Planos e Assinaturas no Cartão de Crédito com renovação automática + ciclos Mensal, Trimestral, Semestral e Anual).
- [x] Qual o gateway de pagamento padrão desejado para o primeiro lançamento?
  - **Resposta do Usuário:** Pagar.me para Cartão/Pix e NOWPayments para Criptomoedas direto na MetaMask (sem KYC). O Asaas não será utilizado.
- [x] Na divisão de split de cartão/Pix, quem deve arcar com as taxas de processamento do gateway (o recebedor principal ou dividida proporcionalmente)?
  - **Resposta do Usuário:** A taxa deve ser repassada proporcionalmente para cada um dos participantes do split.
- [x] Em caso de estorno/chargeback, como o débito deve ser distribuído entre os participantes do split?
  - **Resposta do Usuário:** Em caso de estorno ou chargeback, o débito deve ser distribuído proporcionalmente entre os participantes do split.
- [x] Onde devem ser configurados os Webhooks de saída e quais eventos devem ser suportados?
  - **Resposta do Usuário:** Configuração individual por produto (Opção 2), cobrindo Compra Aprovada, Pix Gerado, Reembolso, Chargeback, Cartão Recusado e Pix Expirado, com Payload detalhado (Opção C) e histórico de logs com botão de reenvio (Opção D).
- [x] Qual idioma/formato deve ser utilizado no campo de status do pedido dentro do payload do webhook?
  - **Resposta do Usuário:** Os status devem ser enviados em português do Brasil ("Compra Aprovada", "Pix Gerado", "Reembolso", "Chargeback", "Cartão Recusado", "Pix Expirado"), com `status_raw` contendo o código técnico em inglês para retrocompatibilidade.
- [x] Quais redes de pixel e estratégia devem ser adotadas para o rastreamento e funil?
  - **Resposta do Usuário:** Meta / Facebook Pixel como padrão (disparando PageView, InitiateCheckout e Purchase com valor em R$), implementado na Etapa 1, seguido por Order Bumps (Etapa 2) e UpSell (Etapa 3).
- [x] O campo "event" na raiz do payload do webhook deve ter qual formato?
  - **Resposta do Usuário:** O campo "event" precisa ser exatamente o mesmo nome que aparece no Status (ex: "Compra Aprovada", "Pix Gerado", etc.), com "event_raw" mantendo a chave técnica em inglês ("order.approved") para retrocompatibilidade.
- [x] Como o campo de telefone/WhatsApp deve funcionar no checkout e ser enviado nos webhooks?
  - **Resposta do Usuário:** Dropdown com DDI (padrão 55 do Brasil) para escolha do país pelo comprador, com envio enriquecido no JSON do webhook contendo `phone` (completo com DDI), `phone_formatted` e `phone_ddi` isolado.

