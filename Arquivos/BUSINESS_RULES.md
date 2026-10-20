# Regras de Negócio - Checkout Próprio

Este documento é a fonte de verdade para as regras de negócio, limites e definições de comportamento do sistema de Checkout Próprio.

---

## 1. Gateways e Taxas
- **Gateways Suportados:**
  - **Pagar.me:** Para Pix à vista, Cartão de Crédito e Pagamentos Híbridos (2 Cartões / Pix + Cartão) com split nativo.
  - **NOWPayments:** Para pagamentos em Criptomoedas direto na MetaMask sem KYC.
  - **Asaas:** Para **Boleto Parcelado (Carnê Digital / BolePix)** e **Entrada via Pix + Parcelas no Boleto** com split automático por parcela e controle de inadimplência.
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
- **Unificação com Usuários da Plataforma (Coprodução e Afiliação por Conta de Usuário):**
  - Os coprodutores (participantes do split) e afiliados são vinculados diretamente aos Usuários cadastrados no sistema.
  - O cadastro inicial do usuário permanece simplificado (Nome, E-mail, Senha e Role).
  - Cada usuário acessa a tela de **Configurações / Meu Perfil** e preenche autonomamente seus próprios dados de repasse (Chave Pix, Tipo de Chave, CPF/CNPJ, Carteira Cripto Web3 e Recipient ID), eliminando a digitação manual de dados bancários de terceiros pelo administrador.
  - Um mesmo usuário pode atuar simultaneamente como Coprodutor no Produto A e como Afiliado no Produto B, recebendo ambas as receitas na mesma conta e Chave Pix configurada.

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

## 4.1. Desconto Automático por Método de Pagamento (Incentivo Pix e Cripto)
- **Configuração por Produto:** Cada produto define individualmente os percentuais `pix_discount_percent` e `crypto_discount_percent` (0.0% a 100.0%, padrão 0.0% = desativado).
- **Badge Chamativo no Checkout:** Quando o percentual for maior que zero, a aba correspondente no checkout exibe um badge destacado com efeito visual: `🔥 X% OFF no Pix (Economize R$ Y,YY)` ou `⚡ X% OFF em Cripto`.
- **Recálculo em Tempo Real:** O resumo do pedido recalcula instantaneamente o valor ao selecionar a aba correspondente, exibindo a linha de dedução `Desconto Pix (X%): -R$ Y,YY` e o total líquido a pagar.
- **Divisão Proporcional no Split:** As cotas de split dos parceiros/coprodutores são calculadas sobre o valor efetivamente liquidado no gateway após o desconto.

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
  3. **Editor Visual com Preview Ao Vivo (Checkout Builder):** O painel administrativo disponibiliza o Checkout Builder com visualização simultânea lado a lado (Split-View), alternância instantânea entre modos Desktop e Mobile (mockup de smartphone) e atualização em tempo real de cores, capa, logo, cronômetro e depoimentos.

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
- **Vínculo com Catálogo de Produtos:** A estrutura básica de cada Order Bump é criada primeiro como um produto independente no catálogo do sistema (`bump_product_id`), permitindo que esse item seja vendido separadamente no futuro caso o produtor deseje.
- **Seleção de Ofertas e Preços:** Caso o produto vinculado possua mais de 1 preço cadastrado (múltiplas ofertas em `product_offers`), o painel de criação do bump disponibiliza um dropdown para que o produtor escolha exatamente qual preço/oferta será cobrada no checkout (`bump_offer_id`).
- **Título Padrão e Customização da Chamada:** Por padrão, ao vincular o produto, o título da chamada de checkout é preenchido automaticamente com o nome do produto selecionado. O produtor pode manter ou personalizar livremente o título e o copy da chamada (ex: "Leve também o Guia Prático com 50% OFF").
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
- **Painel Administrativo (`/recovery`):** Visão centralizada com métricas consolidadas (Total de Abandonos, Total Recuperado, Taxa de Recuperação %, Total Pix Gerado, Pix Pendentes e Valor Pendente em R$) e alternância entre as abas de Carrinhos Abandonados e Pix Gerados/Pendentes.
- **Paginação de Carrinhos Abandonados:** Exibição configurada com **20 itens por página** (`pageSize = 20`), permitindo navegação fluida através de botões "Anterior", "Próxima" e indicador detalhado (*"Mostrando X a Y de Z carrinhos (20 por página)"*). O backend retorna o total de registros através do cabeçalho `X-Total-Count`.
- **Seleção e Exclusão em Massa de Carrinhos:** Checkbox no cabeçalho da tabela para marcar/desmarcar todos os carrinhos da página atual e checkboxes individuais por linha. Barra contextual de ações no topo com contador de itens marcados, botão de desmarcar todos e botão de exclusão múltipla com confirmação via modal seguro com backdrop e fechamento apenas por botão.
- **Exclusão Manual Individual:** Botão de lixeira na coluna de ações para cada carrinho, com confirmação prévia em modal centralizado para prevenir exclusões acidentais.
- **Ações de Recuperação Estilizadas:** Botão WhatsApp esmeralda com abertura direta no aplicativo/web, botão de marcar status como recuperado, botões de ação compactos para reenviar webhook e abrir link de recuperação direta com parâmetros salvos.
- **Confirmação para Reenvio Manual de Webhook:** Ao clicar no botão de reenvio manual do evento de abandono (`checkout.abandoned`), é aberto um modal centralizado de confirmação com backdrop escuro translúcido (sem fechar ao clicar fora, fechamento apenas via botão). O modal exibe um resumo do lead (nome, e-mail, produto e oferta), detalhando o evento a ser re-despachado, com botões "Cancelar" e "Confirmar Reenvio" (com spinner e bloqueio contra múltiplos cliques).

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
  - **Tela Dedicada de Oferta Expirada (`CheckoutExpiredOfferScreen`):** Se a proposta estiver com status `expired` ou `is_expired: true`, ou se o produto estiver desativado (`is_active: false`), o checkout não exibe o formulário de pagamento e nem acusa página não encontrada (404). Em vez disso, exibe uma tela elegante e explicativa informando que a oferta especial encerrou seu prazo ou saiu do ar, disponibilizando:
    - Botão de contato direto com o consultor/closer no WhatsApp para solicitação de reativação ou nova negociação;
    - Botão para acessar a oferta pública normal do produto (`/pay/${slug}`);
    - Botão para retornar à página inicial.
  - **Resolução Dinâmica da URL do Link:** Todas as URLs de proposta geradas no painel administrativo e nas opções de compartilhamento (copiar link e enviar WhatsApp) utilizam a origem dinâmica do navegador (`window.location.origin`) e caminhos relativos, garantindo compatibilidade entre diferentes ambientes e portas locais sem direcionamento indevido.
- **Baixa e Vínculo ao Pedido:**
  - Ao concluir a compra com sucesso (`paid`), o pedido armazena `proposal_id` e a proposta transiciona automaticamente seu status de `active` para `paid`, desativando a reutilização do link.

---

## 17. Descontos Automáticos por Método de Pagamento (Incentivo ao Pix e Cripto)
- **Configuração por Produto:** Cada produto pode ter configurado um percentual de desconto especial para pagamento à vista no Pix (`pix_discount_percent`) ou Criptomoedas (`crypto_discount_percent`).
- **Interface e Range Slider:** No painel de edição do produto (`ProductModal`), os campos de desconto contam com uma barra deslizante (range slider) sincronizada com o input numérico, travada estritamente entre 0% e 100%, sem permitir valores fora desse intervalo.
- **Aplicação no Checkout:** O desconto incide sobre o valor do produto/pedido ao selecionar o respectivo método de pagamento, com destaque visual (badge com percentual de economia) e recálculo automático e proporcional das cotas de split entre os sócios.

---

## 18. Reembolso e Estorno de Pedidos (Reembolso 1-Click com Registro de Motivo)
- **Localização na Interface:**
  - Integrado ao módulo **Vendas & Comercial** -> sub-aba **Relatório de Pedidos**.
  - Acessível diretamente pelo botão de estorno na linha de cada pedido pago na tabela (`RotateCcw`) e pelo botão "Estornar Pedido" no modal de detalhes completos do pedido.
- **Registro Obrigatório do Motivo do Reembolso (`refund_reason`):**
  - O administrador seleciona obrigatoriamente uma categoria de motivo para auditoria interna:
    1. Arrependimento de compra / Prazo de 7 dias
    2. Insatisfação com o conteúdo / produto
    3. Problemas técnicos ou de acesso
    4. Compra em duplicidade / engano do cliente
    5. Acordo comercial direto com o cliente
    6. Outro motivo (especificar no campo de texto aberto)
  - Um campo opcional de observações complementares permite anexar contexto adicional da solicitação do cliente (obrigatório caso a opção "Outro motivo" seja escolhida).
  - O motivo é gravado permanentemente na coluna `refund_reason` da tabela `orders` e exibido no modal de detalhes e na tabela.
- **Validação de Ciclo e Integridade:**
  - Apenas pedidos com status `paid` podem ser estornados. Pedidos pendentes, cancelados ou já reembolsados são bloqueados.
  - Ao confirmar, o pedido transiciona para `status: 'refunded'` e grava o timestamp em `refunded_at`.
- **Estorno no Gateway e Débito no Split:**
  - Aciona o estorno automático na operadora (Pagar.me V5 via `POST /charges/{id}/refund`), distribuindo o estorno proporcionalmente entre todos os parceiros do split (`liable: true`).
- **Disparo de Webhooks de Saída:**
  - Dispara instantaneamente o evento oficial `order.refunded` ("Reembolso") para todas as integrações cadastradas no produto, transmitindo dados do cliente, pedido, `refund_reason` e `refunded_at`.

---

## 19. Gatilhos de Conversão: Exit-Intent Popup e Prova Social ao Vivo

- **Gerenciamento no Catálogo de Produtos:**
  - Configurado individualmente por produto através do menu de ações da tabela de produtos -> **"Gatilhos & Conversão"**.
  - Permite ligar/desligar de forma independente o **Pop-up de Abandono (Exit-Intent)** e as **Notificações de Prova Social ao Vivo**.
- **Exit-Intent Popup (Desconto Relâmpago de Abandono):**
  - O desconto é obrigatoriamente vinculado a um cupom de desconto já cadastrado (`exit_intent_coupon_id`), podendo ser global ou exclusivo do produto.
  - Permite personalizar título e subtítulo com texto persuasivo de última chance.
  - **Mecanismo de Detecção Inteligente:**
    - Desktop: acionado quando o ponteiro do mouse cruza a zona superior da janela (`clientY <= 10px`), indicando intenção de fechar a aba ou digitar outra URL.
    - Mobile: intercepta o clique no botão "Voltar" do navegador via evento `popstate` do histórico.
  - **Regra de Exibição Única por Sessão:** O pop-up só aparece 1 vez por sessão de navegação (`sessionStorage`), garantindo uma experiência não invasiva.
  - **Aplicação em 1 Clique:** Ao clicar em "SIM, QUERO MEU DESCONTO", o cupom é automaticamente validado e injetado nos campos do checkout, recalculando instantaneamente o resumo do pedido e parcelas.
  - **Padrão Estético e Popups:** Backdrop preto translúcido com efeito blur, não fecha ao clicar fora, apenas 1 botão de cancelamento ("Não, obrigado") e 1 botão de ação principal.
- **Prova Social ao Vivo (Social Proof Toast):**
  - Notificações flutuantes no canto inferior da tela com avatar de compra, nome do comprador, localização geográfica, método de pagamento e tempo decorrido ("há 2 min").
  - **Três Modalidades de Origem de Dados (`social_proof_mode`):**
    1. **Híbrido (`hybrid` - Recomendado):** Consulta pedidos reais pagos (`status: 'paid'`) do produto. Se houver menos de 5 pedidos, complementa automaticamente com compradores simulados brasileiros para manter o dinamismo da página.
    2. **Simulado (`simulated`):** Utiliza um catálogo rotativo de nomes e capitais brasileiras autênticas com horários recentes realistas.
    3. **Real (`real`):** Exibe estritamente compras pagas e aprovadas do produto, respeitando a privacidade dos clientes através do mascaramento do sobrenome (ex: "Carlos S.").
  - **Temporizador e Controle do Usuário:** O toast surge após 4 segundos de permanência, permanece visível por 6 segundos e alterna a cada 14 segundos. Inclui botão de dispensar (`X`) para o comprador ocultar caso prefira.

---

## 20. Upsell & Downsell com Catálogo, Tokenização de Cartão e 1-Click Buy

- **Integração Obrigatória com Catálogo de Produtos e Ofertas:**
  - Tanto o UpSell quanto o Downsell podem ser vinculados a um produto real (`upsell_product_id`, `downsell_product_id`) e a uma oferta de preço específica do catálogo (`upsell_offer_id`, `downsell_offer_id`).
  - Isso garante controle de estoque, aplicação das regras de split independentes do produto alvo e suporte a relatórios e vendas individuais futuras.
- **Funil Pós-Compra com Downsell Condicional:**
  - Configurado na modal de UpSell/Downsell com abas organizadas: **"1. Oferta de UpSell"** e **"2. Oferta de Downsell (Opcional)"**.
  - O Downsell possui chave de ativação explícita (`enable_downsell`).
  - Se o comprador recusar a oferta de UpSell ("Não, obrigado"):
    - Caso o Downsell esteja habilitado, a página transiciona instantaneamente e de forma suave para a oferta de Downsell, apresentando uma segunda condição especial antes da página de obrigado.
    - Caso o Downsell esteja desabilitado (ou se o comprador também recusar o Downsell), ele é direcionado imediatamente para a Página de Obrigado (`/thank-you/:orderCode`).
- **Tokenização e Cobrança Real em 1 Clique (1-Click Buy):**
  - **Compradores de Cartão de Crédito:**
    - Ao aprovar o pedido principal no cartão de crédito, o token seguro do cartão (`card_token`) é preservado no pedido pai.
    - Ao aceitar o UpSell ou Downsell, o sistema cobra o cartão em 1 clique sem exigir que o cliente digite novamente número, CVV ou validade.
    - Cria um pedido filho (`parent_order_id`, `order_type: 'upsell' | 'downsell'`) com status `paid` imediato e dispara webhook `order.approved`.
  - **Compradores de Pix (Opção A):**
    - Se o pedido principal foi liquidado via Pix, ao aceitar o UpSell/Downsell o sistema gera instantaneamente uma nova cobrança Pix com QR Code visual e código Copia e Cola EMV, exibindo um modal centralizado na tela.
    - O modal realiza polling em tempo real da liquidação do Pix do produto especial.
    - O modal oferece botão de contingência: *"Prefiro pagar com Cartão de Crédito"*, permitindo que o cliente pague via cartão se desejar.
- **Rastreabilidade e Webhooks de Funil:**
  - Pedidos filhos recebem sufixos específicos (`-UP` para UpSell e `-DW` para Downsell).
  - Webhooks de saída (`order.approved` e `order.waiting_payment`) são disparados individualmente para cada oferta aceita no funil.

---

## 21. Vídeo de Vendas (Mini-VSL) & Player de Áudio estilo WhatsApp no Topo do Checkout

- **Escopo e Configuração:** Configurado individualmente por produto através do Checkout Builder / Editor de Aparência (aba **"Vídeo / Áudio"**).
- **Quatro Modalidades Disponíveis (`header_media_type`):**
  1. **Nenhum (`none`):** Comportamento padrão limpo, sem elementos multimídia extras no topo.
  2. **Apenas Vídeo de Vendas / Mini-VSL (`video`):**
     - Permite incorporar vídeos explicativos curtos no topo do formulário para quebrar objeções finais.
     - Suporta URLs diretas do **YouTube** (com conversão automática para embed seguro com autoplay zero e sem vídeos relacionados), **Vimeo** (`player.vimeo.com`), **PandaVideo**, BunnyCDN e arquivos diretos (`.mp4`, `.webm`) com player HTML5 nativo responsivo em 16:9.
  3. **Apenas Player de Áudio Estilo WhatsApp (`audio`):**
     - Humaniza a decisão de compra com uma mensagem de voz gravada pelo expert ou produtor.
     - **Estética WhatsApp Autêntica:** Avatar circular do especialista com badge de microfone gravado, nome do autor/expert (`header_audio_author_name`), tag "Recado em Áudio", botão de play/pause gradiente esmeralda, barras de ondas sonoras interativas com seek em 1 toque, alternador de velocidade rápida (`1x`, `1.5x`, `2x`), contador de tempo decorrido e duplo check azul (`✓✓`).
  4. **Vídeo + Áudio Simultâneos (`both`):**
     - Exibe ambos os elementos juntos no topo da página: o Vídeo (Mini-VSL) no topo e a Mensagem de Áudio WhatsApp logo abaixo dele, proporcionando o dobro de humanização e quebra de objeções.
- **Comportamento no Checkout e Preview:**
  - Posicionado de forma proeminente no topo da coluna do formulário (`checkout-column-forms`), acima dos campos do cliente e propostas.
  - Sincronizado em tempo real no Live Preview do Checkout Builder tanto no modo Desktop quanto no modo Mobile (smartphone).

---

## 22. Teste A/B Nativo de Checkout e Ofertas (Split 50/50)

- **Escopo e Configuração:** Configurado individualmente por produto através do menu de ações ("Teste A/B de Ofertas"). Exige no mínimo 2 ofertas cadastradas no produto para permitir a comparação.
- **Divisão de Tráfego (Split 50/50):**
  - Permite selecionar a **Variante A** (50% do tráfego) e a **Variante B** (50% do tráfego) entre as ofertas disponíveis do produto.
  - Ao acessar o checkout pelo link principal `/pay/{product_slug}` ou domínio customizado Whitelabel, o visitante é aleatoriamente atribuído a uma das duas variantes.
  - **Persistência no Navegador:** A variante sorteada é salva no `localStorage` do visitante (`checkout_ab_{id}`). Se o cliente atualizar a página, fechar o navegador ou retornar horas depois, continuará visualizando a mesma oferta que lhe foi apresentada inicialmente.
  - **Acesso Direto à Oferta:** Caso o comprador clique diretamente no link exclusivo de uma oferta (`/pay/{offer_slug}`), o checkout respeita a oferta específica indicada pela URL.
- **Funil de Conversão e Métricas em Tempo Real:**
  - **Visitas:** Incrementadas na primeira renderização da oferta sorteada.
  - **Checkouts Iniciados (`initiate_checkout`):** Incrementados na primeira interação do visitante com os campos de cliente ou métodos de pagamento.
  - **Pedidos Pagos e Faturamento (R$):** Contabilizados na aprovação imediata do pagamento ou no processamento de webhooks assíncronos (Pagar.me / NOWPayments).
  - **Taxa de Conversão (%):** Calculada automaticamente pela fórmula `(conversoes / visitas) * 100`.
  - **Variante Vencedora:** Destacada visualmente no painel administrativo com o badge *"🏆 Vencedora"* para a variante com melhor desempenho estatístico.
- **Rastreabilidade em Pedidos e Leads:**
  - As tabelas `orders` e `abandoned_checkouts` armazenam `ab_test_id` e `ab_test_variant` ('A' ou 'B') para auditoria e recuperação de vendas.

---

## 23. Relatório de Pedidos, Paginação e Exclusão Segura (Individual e em Massa)

- **Paginação de Pedidos:**
  - Exibição de **20 pedidos por página** (`pageSize = 20`).
  - Navegação fluida com contagem total (*"Mostrando X a Y de Z pedidos (20 por página)"*), botões "Anterior", "Próxima" e paginação numérica inteligente com elipses quando houver muitas páginas.
  - O backend retorna o total de registros via header HTTP `X-Total-Count`, otimizando a consulta com `skip` e `limit`. Ao alterar termos de busca ou filtros de status/método, a paginação reseta automaticamente para a página 1.
- **Seleção e Ações em Massa:**
  - Checkbox mestre no cabeçalho da tabela (`th`) para marcar ou desmarcar todos os pedidos exibidos na página corrente.
  - Checkboxes individuais por linha de pedido para seleção pontual e granular.
  - **Barra Contextual de Ações:** Surge imediatamente quando há 1 ou mais pedidos selecionados, exibindo a contagem de itens marcados, atalho *"Desmarcar todos"* e botão de destaque *"Excluir selecionados (N)"*.
- **Exclusão Manual (Individual e em Massa):**
  - **Ação Individual:** Botão de lixeira dedicado na coluna de ações de cada linha da tabela.
  - **Modal de Confirmação:** Modal centralizado com backdrop escuro translúcido, protegido contra cliques acidentais fora do painel (fechamento somente por botão), com detalhes do pedido (código e cliente) ou quantidade de itens no caso de exclusão em massa.
  - **Integridade Referencial no Banco:** Exclusão física definitiva com desvinculação segura de chaves estrangeiras (`custom_proposals`, `subscriptions`, `webhook_dispatch_logs`, pedidos filhos `parent_order_id`) e remoção em cascata (`cascade="all, delete-orphan"`) de parcelas de rateio (`splits`) e pagamentos (`payments`).

---

## 24. Regras de Parcelamento no Cartão e Simulador de Lucro Líquido do Split (#4)

- **Configuração Individual por Produto:**
  - `max_installments`: Limite máximo de parcelas permitidas no cartão de crédito (1x a 12x, padrão 12).
  - `free_installments_count`: Quantidade de parcelas sem juros para o comprador (1x a 12x, padrão 1).
  - `interest_rate_percent`: Taxa de juros de parcelamento mensal (padrão de mercado 2.99% a.m.).
  - `interest_payer`: Responsável pelas taxas de juros ('buyer' = comprador paga o acréscimo; 'producer' = produtor assume a taxa).
- **Cálculo Financeiro de Parcelas (Tabela Price):**
  - Parcelas de 1x e parcelas até `free_installments_count` (ou quando `interest_payer == 'producer'`) são calculadas sem juros (`valor / n`).
  - Parcelas acima da faixa sem juros com `interest_payer == 'buyer'` utilizam a fórmula padrão da Tabela Price ($PMT = P \cdot i / (1 - (1+i)^{-n})$). O comprador paga o acréscimo e o valor líquido integral do produtor e dos sócios é preservado.
- **Simulador de Split e Taxas em Tempo Real:**
  - Acessível no painel através do botão *"Ver Simulador de Lucro Líquido & Parcelas"* dentro do modal de Split (`ProductSplitModal`).
  - Gera simulação comparativa instantânea para: **Pix à Vista**, **Cartão 1x**, **Cartão 6x**, **Cartão 12x** e **Criptomoedas**.
  - Apresenta: Valor Bruto, Taxa Estimada do Gateway, Lucro Líquido Total, Margem Líquida da Conta Principal do Produtor e o Repasse Exato (em R$ e %) de cada sócio ativo do split.
  - Oferece seletor interativo de parcelas (1x a 12x) demonstrando exatamente o valor por parcela, o total cobrado e o badge indicando se há juros ou se é sem juros.

---

## 25. Central Rápida do Comprador (`/minhas-compras` e `/my-orders`) e Área de Membros (#15)

- **Acesso Descomplicado (Passwordless OTP):**
  - Autenticação sem senha via e-mail e CPF do comprador.
  - Geração de código numérico aleatório de 6 dígitos (OTP) armazenado na tabela `buyer_access_codes` com hash SHA-256 e expiração de 15 minutos.
  - Token de sessão JWT retornado na validação do código para consultas autenticadas subsequentes sem necessidade de recadastro.
- **Autoatendimento de Pedidos e 2ª Via de Pix:**
  - Listagem dos pedidos do cliente com identificação visual do status (Aprovado, Pendente, etc.), método de pagamento e parcelamento.
  - Para pedidos Pix pendentes:
    - Verificação de validade em tempo real contra `pix_expires_at` ou janela de 30 minutos.
    - Modal centralizado de pagamento com QR Code visual, código Copia e Cola e contagem regressiva em minutos/segundos.
    - Se o Pix tiver expirado, botão de 1 clique *"Regenerar Novo Pix"* cria nova cobrança sem intervenção do suporte.
- **Entrega de Conteúdo / Área de Membros:**
  - Todo produto pode ter uma URL de área de membros / entrega de conteúdo (`member_area_url`).
  - Configurado no painel do produtor pelo modal de edição de produto (`ProductModal.jsx`).
  - Para pedidos aprovados (`status in ['approved', 'paid', 'completed']`), o portal exibe o botão direto *"Acessar Área de Membros"* redirecionando para a URL configurada.
- **Gestão de Assinaturas Recorrentes:**
  - Exibição de plano, ciclo (Mensal, Trimestral, Semestral, Anual), status da assinatura, próxima data de cobrança e histórico de faturas vinculadas.
  - Atualização do cartão de crédito da assinatura pelo próprio assinante através de modal com validação e máscara de cartão, sem necessidade de contato com a equipe de suporte.

---

## 26. Link de Checkout Pré-Preenchido e Auto-Cupom via URL (#2)

- **Parâmetros Suportados na URL do Checkout:**
  - `name`, `customer_name`, `nome`: Nome completo do comprador.
  - `email`, `customer_email`: E-mail para recebimento do acesso.
  - `phone`, `customer_phone`, `telefone`, `whatsapp`: Telefone com DDD.
  - `phone_ddi`, `ddi`: Código internacional do país (padrão 55 Brasil).
  - `cpf`, `customer_cpf`, `document`: Documento CPF (formatado com máscara automática).
  - `coupon`, `cupom`, `voucher`: Código de cupom a ser aplicado instantaneamente.
  - `recover`, `recovery_token`: Token do carrinho abandonado para recuperação com preenchimento em 1 clique.
- **Auto-Preenchimento e Validação Visual:**
  - Ao carregar a página com parâmetros, os campos do formulário são povoados automaticamente.
  - Se os dados pessoais forem detectados via link, o card exibe o badge visual verde *"✓ Pré-preenchido"*.
  - O cupom informado na URL é validado na API (`/api/v1/checkout/validate-coupon`) e aplicado automaticamente com recálculo dos totais e notificação toast.
- **Integração na Recuperação de Vendas (`/recovery` e Webhooks):**
  - O botão de acionamento via WhatsApp na aba de Carrinhos Abandonados enriquece o link direto com todos os dados do lead e o cupom de recuperação.
  - O payload do webhook `checkout.abandoned` envia a chave `recovery_url` contendo a URL montada com os parâmetros do comprador.

---

## 27. Fallback Inteligente de Cartão Recusado (Recuperação Instantânea na Tela) (#5)

- **Gatilho de Acionamento:**
  - Quando uma tentativa de pagamento via Cartão de Crédito (Cartão único, Híbrido Pix + Cartão ou 2 Cartões) for recusada pela adquirente/banco emissor (falta de limite, recusa de antifraude, etc.), o Backend retorna status HTTP 402 com código `card_declined` no header `X-Error-Code`.
  - O checkout intercepta esse erro e abre imediatamente o modal inteligente centralizado (`CardDeclinedFallbackModal.jsx`), sem redirecionar ou recarregar a página.
- **Opções Oferecidas ao Comprador:**
  1. **Finalizar via Pix com Desconto Extra:**
     - Gera ou seleciona Pix instantaneamente com reaproveitamento integral dos dados do comprador (nome, e-mail, telefone, CPF).
     - Aplica automaticamente o percentual de desconto de recuperação (`card_fallback_discount_percent`), configurável por produto no painel admin (se ativado).
  2. **Dividir o Pagamento (Híbrido - Pix + Cartão ou 2 Cartões):**
     - Transfere o fluxo suavemente para o modo híbrido selecionado, permitindo contornar o limite insuficiente no cartão dividindo a compra.
  3. **Tentar Outro Cartão de Crédito:**
     - Limpa apenas os campos de dados do cartão (número, validade, CVV), preservando todos os dados pessoais do comprador para evitar atrito de preenchimento.
- **Configuração no Painel do Produtor:**
  - Configurado no modal "Conversão & Escassez" do produto (`ProductConversionModal.jsx` / `ProductConversionCardFallbackSection.jsx`).
  - Campos:
    - `enable_card_fallback` (booleano, padrão True): Liga/desliga o modal de recuperação instantânea para o produto.
    - `card_fallback_discount_percent` (decimal/float, padrão 0.0): Percentual de desconto adicional ofertado no Pix ao acionar o fallback.
- **Rastreabilidade e Webhooks:**
  - Disparo de log de auditoria no escudo de segurança (`security_service.log_card_attempt` com status `declined`).
  - Disparo do webhook de saída `order.card_declined` ("Cartão Recusado") com dados do comprador para ferramentas de automação (n8n/Make).

---

## 28. Endereço de Cobrança & Antifraude (ViaCEP) (#21)

- **Objetivo e Princípio de Conversão:**
  - Em infoprodutos e mentorias de ticket médio/alto, a ausência de dados de endereço aumenta o índice de recusa de cartões pelos motores antifraude das adquirentes (ClearSale, Konduto, Pagar.me).
  - O recurso é **opcional por produto** (`require_billing_address`), garantindo que ofertas de impulso/baixo ticket mantenham um checkout ultrarrápido sem solicitação de endereço.
- **Comportamento Dinâmico no Checkout:**
  - O bloco de "Endereço de Cobrança" só é renderizado quando:
    1. O produto possui `require_billing_address = True`; E
    2. O método de pagamento selecionado é **Cartão de Crédito** ou **Pagamento Híbrido** (`hybrid_pix_card`, `hybrid_two_cards`).
  - Para pagamentos em **Pix** ou **Criptomoedas**, os campos de endereço permanecem ocultos, preservando a agilidade do checkout em 1 clique.
- **Autocompletar Inteligente via ViaCEP:**
  - Ao digitar o 8º dígito do CEP (máscara `00000-000`), o frontend realiza consulta assíncrona na API pública do **ViaCEP** com debounce.
  - Preenche automaticamente: Logradouro (Rua/Avenida), Bairro, Cidade e UF (Estado).
  - Caso a chamada direta ao ViaCEP falhe por problemas de rede/CORS, o sistema aciona automaticamente o fallback no endpoint do Backend (`/api/v1/checkout/cep/{cep}`).
  - O comprador apenas informa o **Número** e opcionalmente o **Complemento**.
  - Permite edição manual de logradouro e bairro (essencial para CEPs únicos de cidades do interior onde o ViaCEP não detalha o logradouro).
- **Validação e Persistência no Backend:**
  - Se o produto exigir endereço e o método for Cartão/Híbrido, a API rejeita transações incompletas com `HTTP 400 Bad Request` indicando os campos ausentes.
  - Os dados de endereço (`billing_zip_code`, `billing_street`, `billing_number`, `billing_complement`, `billing_neighborhood`, `billing_city`, `billing_state`) são persistidos na ordem (`orders`) e nos carrinhos abandonados (`abandoned_checkouts`).

---

## 20. Boleto Parcelado & Carnê Digital via Asaas (#6)
- **Modelo Híbrido com Entrada Pix:** O comprador quita a 1ª parcela imediatamente via Pix Copia e Cola / QR Code para liberação instantânea do produto. As parcelas subsequentes (da 2ª até a N-ésima) são geradas em carnê digital mensal no Asaas com Boleto e BolePix (QR Code Pix embutido).
- **Controle de Parcelas no Banco de Dados:** Cada cota é salva na tabela `order_installments` com identificador `asaas_payment_id`, status (`pending`, `paid`, `overdue`), link do boleto e código de barras.
- **Liberação e Inadimplência:**
  - O pagamento da 1ª parcela muda o pedido principal para `paid` e dispara o webhook `order.paid` / `order.approved`.
  - As parcelas seguintes quitadas disparam `order.installment_paid`.
  - Caso uma parcela subsequente vença sem pagamento, o webhook do Asaas (`PAYMENT_OVERDUE`) marca a parcela como `overdue` e dispara o webhook `order.installment_overdue`, permitindo bloqueio automático na área de membros ou réguas de cobrança no WhatsApp/n8n.
- **Configuração no Produto:** Habilitação por produto (`enable_asaas_installments`), máximo de parcelas (`asaas_max_installments`, 2 a 24x), taxa de acréscimo mensal (`asaas_interest_percent`) e obrigatoriedade de entrada via Pix (`asaas_require_entry_pix`).

---

## 📋 Perguntas em Aberto sobre Regras de Negócio
*(Questões pendentes de alinhamento com o usuário)*

- [x] Como deseja estruturar o modelo de pagamento da recorrência?
  - **Resposta do Usuário:** Pagar.me V5 (Planos e Assinaturas no Cartão de Crédito com renovação automática + ciclos Mensal, Trimestral, Semestral e Anual).
- [x] Qual o gateway de pagamento padrão desejado para o primeiro lançamento?
  - **Resposta do Usuário:** Pagar.me para Cartão/Pix, NOWPayments para Criptomoedas direto na MetaMask (sem KYC), e Asaas para a modalidade de Carnê Digital e Boleto/Pix Parcelado com Entrada Pix (#6 do Roadmap).
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
- [x] Quando o infoprodutor subir tanto um vídeo quanto um áudio, como o checkout deve se comportar?
  - **Resposta do Usuário:** Adicionar a opção "Vídeo + Áudio" (`both`) no seletor para exibir ambos simultaneamente (o Vídeo no topo e o Áudio WhatsApp logo abaixo).
- [x] Qual deve ser o comportamento padrão das taxas de parcelamento no cartão?
  - **Resposta do Usuário:** Juros repassados ao comprador por padrão (o comprador paga o acréscimo das parcelas de 2x a 12x via Tabela Price, mantendo o valor líquido integral do produtor/sócios, com opção de definir até X parcelas sem juros por produto).


