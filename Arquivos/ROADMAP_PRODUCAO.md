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

#### #2. Link de Checkout Pré-Preenchido + Auto-Cupom via URL (1-Click Lead Checkout)
- **Objetivo:** Dobrar a conversão nas vendas de WhatsApp (X1 / Closers) e nos links de recuperação de carrinho abandonado, eliminando a redigitação de dados.
- **Entregáveis:**
  - Leitura automática de Query Params na URL do checkout: `?name=...&email=...&phone=...&cpf=...&coupon=VIP10`.
  - Preenchimento instantâneo dos campos do comprador, avanço automático para a seleção de pagamento e aplicação automática do cupom de desconto com feedback visual na tela.
  - Geração automática desse link pré-preenchido nos disparos de webhook de `checkout.abandoned` e no botão de recuperação via WhatsApp do painel.
  - Testes unitários Frontend.

#### #3. Desconto Automático por Método de Pagamento (Incentivo ao Pix e Cripto)
- **Objetivo:** Migrar até 30% dos compradores do Cartão para o Pix ou Cripto, garantindo recebimento à vista, taxa menor e risco zero de chargeback.
- **Entregáveis:**
  - Configuração no produto de percentual de desconto exclusivo para **Pix** (`pix_discount_percent`) e/ou **Cripto** (`crypto_discount_percent`).
  - Badge visual pulsante na aba do método de pagamento: `"ECONOMIZE X% (R$ Y) PAGANDO NO PIX"`.
  - Recálculo automático do valor da ordem e das cotas de split quando o comprador seleciona Pix ou Cripto.
  - Testes unitários Backend e Frontend.

#### #4. Regras de Parcelamento no Cartão + Simulador de Taxas e Lucro Líquido do Split
- **Objetivo:** Permitir parcelamento em até 12x protegendo a margem do produtor e dando clareza exata de quanto cada sócio receberá líquido.
- **Entregáveis:**
  - Configuração por produto do máximo de parcelas (1x a 12x), parcelas sem juros e repasse de juros ao comprador vs absorção pelo produtor.
  - **Calculadora/Simulador em Tempo Real no Painel:** Tabela dentro da configuração do produto/split mostrando exatamente quanto sobra líquido para cada sócio em vendas no Pix, 1x no Cartão, 12x no Cartão, Boleto Parcelado ou Cripto.
  - Testes unitários Backend e Frontend.

#### #5. Fallback Inteligente de Cartão Recusado (Recuperação Instantânea na Tela)
- **Objetivo:** Salvar na hora de 15% a 25% das vendas cujo cartão de crédito é negado pelo banco ou por falta de limite.
- **Entregáveis:**
  - Modal inteligente acionado no exato momento em que o cartão retorna recusado (`card_declined`).
  - Oferta imediata de conversão em 1 clique: *"Seu banco recusou a transação? Finalize agora via **Pix com +X% de desconto extra** ou **divida em 2 cartões / Pix + Cartão**!"*.
  - Geração instantânea do QR Code Pix reaproveitando todos os dados já preenchidos.
  - Testes unitários Backend e Frontend.

---

### 🟠 PRIORIDADE 2: Novos Meios de Pagamento, Contingência Multi-Gateway & High-Ticket
*(Destravar vendas para clientes sem limite no cartão e blindar a operação contra quedas e fraudes)*

#### #6. Sistema de Boleto Parcelado & Pix Parcelado via Asaas (Carnê Digital + Entrada Pix)
- **Objetivo:** Aumentar em 20% a 35% as vendas de médio e alto ticket (R$ 497 a R$ 10.000) para clientes sem limite no cartão de crédito.
- **Entregáveis:**
  - Integração do gateway **Asaas** no módulo "Gateways & Split" (API Key Sandbox/Produção, Token de Webhook e `walletId` dos recebedores).
  - Aba **"Boleto / Pix Parcelado"** no checkout com parcelamento configurável (até 12x ou 24x).
  - Modalidade **"Entrada no Pix + Parcelas no Boleto/BolePix"**: O comprador paga a 1ª parcela (ou entrada) via Pix imediato para liberar o acesso na hora, e o Asaas gera o carnê mensal das demais parcelas (cada boleto já vem com QR Code Pix embutido).
  - Split automático no Asaas distribuindo a porcentagem de cada sócio a cada parcela paga.
  - Webhooks de controle de parcelas: `order.installment_paid` e `order.installment_overdue` (para bloqueio automático de inadimplentes na área de membros/n8n).
  - Testes unitários Backend e Frontend.

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

#### #9. Gerador de "Link de Negociação Personalizada" (Para Closers / Vendas High-Ticket)
- **Objetivo:** Permitir que o time comercial feche acordos sob medida no WhatsApp/Zoom mantendo o Split automático dos sócios.
- **Entregáveis:**
  - Tela/Modal **"Gerar Proposta Individual"** no painel admin.
  - Definição rápida de: Produto, Nome/Telefone do Cliente, Valor Fechado, Condição Especial (ex: R$ 1.000 de entrada no Pix + 6x de R$ 400 no Cartão ou Boleto) e Prazo de Expiração do link (ex: 24h).
  - Testes unitários Backend e Frontend.

#### #10. Escudo Anti-Carding, Velocity Check & Blacklist Própria (Proteção de Conta no Gateway)
- **Objetivo:** Impedir que robôs testadores de cartões clonados ("carding") derrubem sua taxa de aprovação ou bloqueiem sua conta no Pagar.me/Asaas.
- **Entregáveis:**
  - **Velocity Check:** Bloqueio automático temporário da opção de Cartão se o mesmo IP, CPF ou dispositivo tiver 3 cartões recusados em menos de 10 minutos (forçando apenas Pix ou Cripto).
  - **Blacklist no Painel:** Bloqueio manual ou automático de CPFs, e-mails, telefones e IPs que já aplicaram chargeback no passado.
  - Testes unitários Backend e Frontend.

---

### 🟡 PRIORIDADE 3: Funil de Lucro Máximo (1-Click Buy), Retenção na Página & Humanização
*(Aumentar o ticket médio por comprador e segurar indecisos dentro do checkout)*

#### #11. Upsell & Downsell Real em 1 Clique (Tokenização de Cartão + Funil Completo)
- **Objetivo:** Fazer o cliente comprar ofertas pós-compra com 1 único clique sem precisar digitar o cartão novamente, e recuperar quem recusa o Upsell.
- **Entregáveis:**
  - **One-Click Buy no Cartão:** Armazenamento seguro do `card_token` / `customer_id` da compra principal para debitar o Upsell/Downsell instantaneamente em 1 clique.
  - **Fluxo com Downsell:** Compra Principal ➔ **Upsell** ➔ Se clicar em *"Não, obrigado"*, redireciona para o **Downsell** (oferta mais acessível) ➔ **Página de Obrigado**.
  - Testes unitários Backend e Frontend.

#### #12. Exit-Intent Popup (Desconto de Última Chance) & Prova Social Ao Vivo
- **Objetivo:** Segurar o visitante indeciso que tenta fechar a aba do checkout e gerar senso de urgência real.
- **Entregáveis:**
  - **Exit-Intent Popup:** Detecção de intenção de saída no Desktop e Mobile, abrindo modal configurável com cupom relâmpago aplicável em 1 clique.
  - **Notificações Ao Vivo:** Balões discretos no canto da tela (*"Gabriel de Curitiba acabou de adquirir via Pix"*) configuráveis por produto.
  - Testes unitários Frontend.

#### #13. Vídeo de Vendas (Mini-VSL) & Player de Áudio estilo WhatsApp no Topo do Checkout
- **Objetivo:** Humanizar o checkout e quebrar objeções finais com a voz ou vídeo do expert.
- **Entregáveis:**
  - Opção no produto para incorporar um **Vídeo Curto** (YouTube/Vimeo/PandaVideo/MP4) ou um **Player de Áudio estilo mensagem de voz do WhatsApp** (com foto do expert e ondas sonoras) no topo do checkout.
  - Testes unitários Frontend.

#### #14. Notificação "Cha-Ching" em Tempo Real para os Sócios (Alertas de Venda com Cota do Split)
- **Objetivo:** Avisar os sócios em tempo real a cada Pix gerado ou venda aprovada, já informando o lucro individual de cada um.
- **Entregáveis:**
  - Efeito sonoro opcional de "Caixa Registradora" (*Cha-Ching*) no painel admin quando entra uma nova venda.
  - Disparo automático de notificação formatada (via Webhook dedicado para WhatsApp/Telegram) exibindo Produto, Valor Total, Método, UTM de origem e **quanto cada sócio recebeu líquido no Split**.
  - Testes unitários Backend e Frontend.

---

### 🔵 PRIORIDADE 4: Autoatendimento do Aluno, Co-Produção com Prazo, Multi-Tráfego & Testes A/B
*(Reduzir suporte a zero, automatizar contratos de parceiros e escalar tráfego)*

#### #15. Central Rápida do Comprador (`/minhas-compras` — 2ª Via de Boleto/Pix sem Suporte)
- **Objetivo:** Evitar que compradores de Boleto Parcelado ou Assinaturas chamem o suporte todo mês para pedir segunda via de boleto ou código Pix.
- **Entregáveis:**
  - Página pública Clean White (`/my-orders`) onde o aluno consulta seus pedidos/parcelas informando e-mail e CPF.
  - Cópia imediata do Pix da parcela do mês, download da 2ª via do boleto Asaas e troca de cartão da assinatura.
  - Testes unitários Backend e Frontend.

#### #16. Co-Produção com Prazo de Contrato (`valid_until`)
- **Objetivo:** Automatizar contratos temporários de co-produção/lançamento no split.
- **Entregáveis:**
  - **Expiração Automática de Split (`valid_until`):** Data limite opcional para a cota de um co-produtor no split do produto, retornando a porcentagem ao produtor principal após o fim do período.
  - Testes unitários Backend e Frontend.

#### #17. Multi-Pixels de Conversão (Google Ads, TikTok Ads & Kwai Ads)
- **Objetivo:** Escalar tráfego pago em múltiplas redes de anúncios além da Meta.
- **Entregáveis:**
  - Configuração por produto de **Google Ads ID + Conversion Label** (`AW-XXXXX/YYYYY`), **TikTok Pixel ID** e **Kwai Pixel ID** disparando `PageView`, `InitiateCheckout` e `Purchase`.
  - Testes unitários Frontend.

#### #18. Teste A/B Nativo de Checkout e Ofertas (Split Testing 50/50)
- **Objetivo:** Descobrir cientificamente qual preço, layout ou configuração gera mais lucro por visitante.
- **Entregáveis:**
  - Distribuição automática 50/50 de tráfego entre duas variantes de oferta/checkout e relatório comparativo de conversão (`Visitas ➔ InitiateCheckout ➔ Vendas Pagas`).
  - Testes unitários Backend e Frontend.

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

#### #21. Dados de Antifraude & Endereço de Cobrança para Cartão/Boleto (ViaCEP)
- **Objetivo:** Aumentar aprovação de cartão em tickets altos e atender exigências de emissão de boletos registrados.
- **Entregáveis:**
  - Toggle por produto para solicitar CEP (com autocompletar automático via **ViaCEP**), Número e Complemento quando o cliente pagar via Cartão ou Boleto.
  - Testes unitários Backend e Frontend.

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
| **#2. Link de Checkout Pré-Preenchido + Auto-Cupom via URL** | Conversão X1/Whats | ⏳ A Fazer |
| **#3. Desconto Automático por Método (Incentivo Pix/Cripto)** | Margem & Caixa | ⏳ A Fazer |
| **#4. Regras de Parcelamento no Cartão + Simulador de Split** | Precificação 12x | ⏳ A Fazer |
| **#5. Fallback Inteligente de Cartão Recusado (Modal Pix)** | Recuperação Instantânea | ⏳ A Fazer |
| **#6. Boleto Parcelado & Pix Parcelado via Asaas (Entrada + Carnê)** | High-Ticket (+35%) | ⏳ A Fazer |
| **#7. Contingência Automática Multi-Gateway (Smart Failover)** | Blindagem de Quedas | ⏳ A Fazer |
| **#8. Pagamento Híbrido: Pix + Cartão e 2 Cartões (Fatia Limite)** | Conversão sem Limite | ✅ Concluído (100%) |
| **#9. Gerador de Link de Negociação Personalizada (Closers)** | Fechamento Comercial | ✅ Concluído (100%) |
| **#10. Escudo Anti-Carding, Velocity Check & Blacklist Própria** | Segurança da Conta | ⏳ A Fazer |
| **#11. Upsell & Downsell Real em 1 Clique (Tokenização Cartão)** | 1-Click Buy Pós-Venda | ⏳ A Fazer |
| **#12. Exit-Intent Popup (Cupom Relâmpago) & Prova Social Ao Vivo** | Retenção de Saída | ⏳ A Fazer |
| **#13. Vídeo de Vendas (Mini-VSL) & Áudio WhatsApp no Checkout** | Humanização & Prova | ⏳ A Fazer |
| **#14. Notificação "Cha-Ching" em Tempo Real para os Sócios** | Alertas com Split | ⏳ A Fazer |
| **#15. Central Rápida do Comprador (`/minhas-compras` — 2ª Via)** | Redução de Suporte | ⏳ A Fazer |
| **#16. Co-Produção com Prazo de Contrato (`valid_until`)** | Contratos Temporários | ✅ Concluído (100%) |
| **#17. Multi-Pixels (Google Ads, TikTok Ads & Kwai Ads)** | Escala Multi-Rede | ⏳ A Fazer |
| **#18. Teste A/B Nativo de Checkout e Ofertas (Split 50/50)** | Otimização de ROI | ⏳ A Fazer |
| **#19. Carteiras Digitais 1-Toque Mobile (Apple Pay & Google Pay)** | Mobile 1-Toque | ⏳ A Fazer |
| **#20. Reembolso 1-Click no Painel** | Pós-Venda Seguro | ⏳ A Fazer |
| **#21. Antifraude & Endereço de Cobrança Cartão/Boleto (ViaCEP)** | Aprovação & Boletos | ⏳ A Fazer |
| **#22. Editor Visual de Checkout com Preview Ao Vivo** | Builder Visual | ⏳ A Fazer |
| **#23. Domínios Personalizados (CNAME Whitelabel)** | Autoridade de Marca | ⏳ A Fazer |

---

## 🛠️ Diretrizes de Execução dos Itens

Para cada item da lista que iniciarmos, o protocolo obrigatório permanece:
1. **Modo Rápido como padrão:** Implementação limpa + Testes unitários automatizados (Backend Pytest e Frontend Vitest).
2. **Auditoria Contínua de Limites de Código:** Backend ≤ 1.000 linhas por arquivo | Frontend e CSS ≤ 500 linhas por arquivo.
3. **Integridade de Esquema:** Scripts de migração criados e registrados em `DATABASE_SCHEMA_LOG.md`.
4. **Regras de Negócio:** Consulta e atualização contínua em `BUSINESS_RULES.md`.
