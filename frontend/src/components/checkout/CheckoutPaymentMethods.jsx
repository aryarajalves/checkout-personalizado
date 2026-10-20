import React from 'react';
import { QrCode, CreditCard, Coins, CheckCircle2, Split, Layers, FileText } from 'lucide-react';
import { maskCardNumber, maskCardExpiry, formatCurrency } from './checkoutUtils';
import HybridPaymentForm from './HybridPaymentForm';
import CheckoutAsaasInstallmentForm from './CheckoutAsaasInstallmentForm';
import { calculateClientInstallments } from '../product-management/installmentApi';

export default function CheckoutPaymentMethods({
  paymentMethod,
  onSelectMethod,
  allowedPaymentMethod = 'all',
  cardData,
  onCardChange,
  cryptoData,
  onCryptoChange,
  hybridData,
  onHybridChange,
  asaasData,
  onAsaasChange,
  totalPriceBrl = 0,
  pixDiscountPercent,
  cryptoDiscountPercent,
  product = null,
  maxInstallments,
  freeInstallmentsCount,
  interestRatePercent,
  interestPayer,
  errors = {}
}) {
  const isMethodDisabled = (methodKey) => Boolean(
    allowedPaymentMethod && allowedPaymentMethod !== 'all' && allowedPaymentMethod !== methodKey
  );

  const effectivePixDiscount = pixDiscountPercent !== undefined ? pixDiscountPercent : (product?.pix_discount_percent || 0);
  const effectiveCryptoDiscount = cryptoDiscountPercent !== undefined ? cryptoDiscountPercent : (product?.crypto_discount_percent || 0);
  const effectiveMaxInst = maxInstallments !== undefined ? maxInstallments : (product?.max_installments || 12);
  const effectiveFreeInst = freeInstallmentsCount !== undefined ? freeInstallmentsCount : (product?.free_installments_count || 1);
  const effectiveInterestRate = interestRatePercent !== undefined ? interestRatePercent : (product?.interest_rate_percent !== undefined ? product.interest_rate_percent : 2.99);
  const effectiveInterestPayer = interestPayer || product?.interest_payer || 'buyer';

  const handleCardNumber = (e) => {
    const masked = maskCardNumber(e.target.value);
    onCardChange({ target: { name: 'cardNumber', value: masked } });
  };

  const handleCardExpiry = (e) => {
    const masked = maskCardExpiry(e.target.value);
    onCardChange({ target: { name: 'cardExpiry', value: masked } });
  };

  // Gerar opções de parcelamento dinâmicas respeitando as regras do produto
  const installmentOptions = calculateClientInstallments({
    totalPriceBrl,
    maxInstallments: effectiveMaxInst,
    freeInstallmentsCount: effectiveFreeInst,
    interestRatePercent: effectiveInterestRate,
    interestPayer: effectiveInterestPayer,
    formatCurrencyFn: (val) => formatCurrency(val, 'BRL'),
  });

  return (
    <div className="checkout-step-card" data-testid="checkout-payment-methods">
      <div className="checkout-step-header">
        <div className="checkout-step-number">2</div>
        <div>
          <h3 className="checkout-step-title">Forma de Pagamento</h3>
          <p className="checkout-step-desc">Selecione o método desejado para efetuar a compra</p>
          {allowedPaymentMethod && allowedPaymentMethod !== 'all' && (
            <div className="proposal-payment-lock-notice" style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px',
              color: '#1e40af', fontSize: '12px', fontWeight: 500, marginTop: '6px'
            }}>
              <span>🔒 Forma de pagamento fixada na proposta personalizada. As outras opções estão indisponíveis.</span>
            </div>
          )}
        </div>
      </div>

      {/* Abas de Pagamento */}
      <div className="checkout-payment-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          disabled={isMethodDisabled('pix')}
          aria-selected={paymentMethod === 'pix'}
          aria-disabled={isMethodDisabled('pix')}
          className={`checkout-payment-tab ${paymentMethod === 'pix' ? 'active' : ''} ${isMethodDisabled('pix') ? 'disabled-proposal' : ''}`}
          onClick={() => !isMethodDisabled('pix') && onSelectMethod('pix')}
          data-testid="tab-payment-pix"
          title={isMethodDisabled('pix') ? 'Forma de pagamento não permitida nesta proposta' : undefined}
        >
          <div className="checkout-tab-icon-box pix">
            <QrCode size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Pix</span>
            <span className="checkout-tab-sub">
              {isMethodDisabled('pix') ? 'Indisponível' : (allowedPaymentMethod === 'pix' ? 'Fixo na Proposta' : 'Imediato')}
            </span>
          </div>
          {effectivePixDiscount > 0 && !isMethodDisabled('pix') && (
            <span className="payment-discount-badge pix-badge" data-testid="pix-discount-badge">
              🔥 {effectivePixDiscount}% OFF
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          disabled={isMethodDisabled('credit_card')}
          aria-selected={paymentMethod === 'credit_card'}
          aria-disabled={isMethodDisabled('credit_card')}
          className={`checkout-payment-tab ${paymentMethod === 'credit_card' ? 'active' : ''} ${isMethodDisabled('credit_card') ? 'disabled-proposal' : ''}`}
          onClick={() => !isMethodDisabled('credit_card') && onSelectMethod('credit_card')}
          data-testid="tab-payment-card"
          title={isMethodDisabled('credit_card') ? 'Forma de pagamento não permitida nesta proposta' : undefined}
        >
          <div className="checkout-tab-icon-box card">
            <CreditCard size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Cartão</span>
            <span className="checkout-tab-sub">
              {isMethodDisabled('credit_card') ? 'Indisponível' : (allowedPaymentMethod === 'credit_card' ? 'Fixo na Proposta' : `Até ${effectiveMaxInst}x`)}
            </span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          disabled={isMethodDisabled('crypto')}
          aria-selected={paymentMethod === 'crypto'}
          aria-disabled={isMethodDisabled('crypto')}
          className={`checkout-payment-tab ${paymentMethod === 'crypto' ? 'active' : ''} ${isMethodDisabled('crypto') ? 'disabled-proposal' : ''}`}
          onClick={() => !isMethodDisabled('crypto') && onSelectMethod('crypto')}
          data-testid="tab-payment-crypto"
          title={isMethodDisabled('crypto') ? 'Forma de pagamento não permitida nesta proposta' : undefined}
        >
          <div className="checkout-tab-icon-box crypto">
            <Coins size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Cripto</span>
            <span className="checkout-tab-sub">
              {isMethodDisabled('crypto') ? 'Indisponível' : (allowedPaymentMethod === 'crypto' ? 'Fixo na Proposta' : 'MetaMask')}
            </span>
          </div>
          {effectiveCryptoDiscount > 0 && !isMethodDisabled('crypto') && (
            <span className="payment-discount-badge crypto-badge" data-testid="crypto-discount-badge">
              ⚡ {effectiveCryptoDiscount}% OFF
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          disabled={isMethodDisabled('hybrid_pix_card')}
          aria-selected={paymentMethod === 'hybrid_pix_card'}
          aria-disabled={isMethodDisabled('hybrid_pix_card')}
          className={`checkout-payment-tab ${paymentMethod === 'hybrid_pix_card' ? 'active' : ''} ${isMethodDisabled('hybrid_pix_card') ? 'disabled-proposal' : ''}`}
          onClick={() => !isMethodDisabled('hybrid_pix_card') && onSelectMethod('hybrid_pix_card')}
          data-testid="tab-payment-hybrid-pix-card"
          title={isMethodDisabled('hybrid_pix_card') ? 'Forma de pagamento não permitida nesta proposta' : undefined}
        >
          <div className="checkout-tab-icon-box pix">
            <Split size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Pix + Cartão</span>
            <span className="checkout-tab-sub">
              {isMethodDisabled('hybrid_pix_card') ? 'Indisponível' : (allowedPaymentMethod === 'hybrid_pix_card' ? 'Fixo na Proposta' : 'Entrada + 12x')}
            </span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          disabled={isMethodDisabled('hybrid_two_cards')}
          aria-selected={paymentMethod === 'hybrid_two_cards'}
          aria-disabled={isMethodDisabled('hybrid_two_cards')}
          className={`checkout-payment-tab ${paymentMethod === 'hybrid_two_cards' ? 'active' : ''} ${isMethodDisabled('hybrid_two_cards') ? 'disabled-proposal' : ''}`}
          onClick={() => !isMethodDisabled('hybrid_two_cards') && onSelectMethod('hybrid_two_cards')}
          data-testid="tab-payment-hybrid-two-cards"
          title={isMethodDisabled('hybrid_two_cards') ? 'Forma de pagamento não permitida nesta proposta' : undefined}
        >
          <div className="checkout-tab-icon-box card">
            <Layers size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">2 Cartões</span>
            <span className="checkout-tab-sub">
              {isMethodDisabled('hybrid_two_cards') ? 'Indisponível' : (allowedPaymentMethod === 'hybrid_two_cards' ? 'Fixo na Proposta' : 'Dividir limite')}
            </span>
          </div>
        </button>

        {product?.enable_asaas_installments && (
          <button
            type="button"
            role="tab"
            disabled={isMethodDisabled('asaas_installments')}
            aria-selected={paymentMethod === 'asaas_installments'}
            aria-disabled={isMethodDisabled('asaas_installments')}
            className={`checkout-payment-tab ${paymentMethod === 'asaas_installments' ? 'active' : ''} ${isMethodDisabled('asaas_installments') ? 'disabled-proposal' : ''}`}
            onClick={() => !isMethodDisabled('asaas_installments') && onSelectMethod('asaas_installments')}
            data-testid="tab-payment-asaas-carnet"
            title={isMethodDisabled('asaas_installments') ? 'Forma de pagamento não permitida nesta proposta' : undefined}
          >
            <div className="checkout-tab-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
              <FileText size={18} />
            </div>
            <div className="checkout-tab-text">
              <span className="checkout-tab-title">Boleto Parcelado</span>
              <span className="checkout-tab-sub">
                {isMethodDisabled('asaas_installments') ? 'Indisponível' : (allowedPaymentMethod === 'asaas_installments' ? 'Fixo na Proposta' : `Carnê até ${product.asaas_max_installments || 12}x`)}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Conteúdo da Aba PIX */}
      {paymentMethod === 'pix' && (
        <div className="checkout-tab-content" data-testid="payment-content-pix">
          <div className="checkout-pix-info-box">
            <CheckCircle2 size={24} className="checkout-pix-icon" />
            <div>
              <h4 className="checkout-pix-title">Pagamento Instantâneo via Pix</h4>
              <p className="checkout-pix-desc">
                Ao clicar em <strong>Finalizar Pagamento</strong>, o código Pix Copia e Cola e o QR Code serão gerados imediatamente.
                A liberação do produto ocorre em menos de 10 segundos após a confirmação.
              </p>
            </div>
          </div>
          {pixDiscountPercent > 0 && (
            <div className="checkout-discount-applied-banner pix" data-testid="pix-discount-applied-banner" style={{ marginTop: '12px', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '13px', fontWeight: 600 }}>
              🔥 Desconto exclusivo de {pixDiscountPercent}% aplicado no Pix!
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba Cartão de Crédito */}
      {paymentMethod === 'credit_card' && (
        <div className="checkout-tab-content" data-testid="payment-content-card">
          <div className="checkout-card-form-grid">
            <div className="checkout-field-group full-width">
              <label className="checkout-label" htmlFor="card-number">
                Número do Cartão
              </label>
              <input
                id="card-number"
                name="cardNumber"
                type="text"
                placeholder="0000 0000 0000 0000"
                value={cardData.cardNumber || ''}
                onChange={handleCardNumber}
                className={`checkout-input ${errors.cardNumber ? 'error' : ''}`}
                data-testid="input-card-number"
              />
              {errors.cardNumber && <span className="checkout-error-text">{errors.cardNumber}</span>}
            </div>

            <div className="checkout-field-group full-width">
              <label className="checkout-label" htmlFor="card-holder">
                Nome Impresso no Cartão
              </label>
              <input
                id="card-holder"
                name="cardHolder"
                type="text"
                placeholder="Como está gravado no cartão"
                value={cardData.cardHolder || ''}
                onChange={onCardChange}
                className={`checkout-input ${errors.cardHolder ? 'error' : ''}`}
                data-testid="input-card-holder"
              />
              {errors.cardHolder && <span className="checkout-error-text">{errors.cardHolder}</span>}
            </div>

            <div className="checkout-field-group">
              <label className="checkout-label" htmlFor="card-expiry">
                Validade (MM/AA)
              </label>
              <input
                id="card-expiry"
                name="cardExpiry"
                type="text"
                placeholder="MM/AA"
                value={cardData.cardExpiry || ''}
                onChange={handleCardExpiry}
                className={`checkout-input ${errors.cardExpiry ? 'error' : ''}`}
                data-testid="input-card-expiry"
              />
              {errors.cardExpiry && <span className="checkout-error-text">{errors.cardExpiry}</span>}
            </div>

            <div className="checkout-field-group">
              <label className="checkout-label" htmlFor="card-cvv">
                CVV
              </label>
              <input
                id="card-cvv"
                name="cardCvv"
                type="password"
                maxLength={4}
                placeholder="123"
                value={cardData.cardCvv || ''}
                onChange={onCardChange}
                className={`checkout-input ${errors.cardCvv ? 'error' : ''}`}
                data-testid="input-card-cvv"
              />
              {errors.cardCvv && <span className="checkout-error-text">{errors.cardCvv}</span>}
            </div>

            <div className="checkout-field-group full-width">
              <label className="checkout-label" htmlFor="card-installments">
                Parcelamento
              </label>
              <select
                id="card-installments"
                name="installments"
                value={cardData.installments || 1}
                onChange={onCardChange}
                className="checkout-select"
                data-testid="select-card-installments"
              >
                {installmentOptions.map((opt) => (
                  <option key={opt.installments} value={opt.installments}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Cripto */}
      {paymentMethod === 'crypto' && (
        <div className="checkout-tab-content" data-testid="payment-content-crypto">
          <div className="checkout-crypto-form-grid">
            <div className="checkout-field-group">
              <label className="checkout-label" htmlFor="crypto-currency">
                Criptomoeda
              </label>
              <select
                id="crypto-currency"
                name="currency"
                value={cryptoData.currency || 'USDT'}
                onChange={onCryptoChange}
                className="checkout-select"
                data-testid="select-crypto-currency"
              >
                <option value="USDT">USDT (Tether USD)</option>
                <option value="USDC">USDC (USD Coin)</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
              </select>
            </div>

            <div className="checkout-field-group">
              <label className="checkout-label" htmlFor="crypto-network">
                Rede (Blockchain)
              </label>
              <select
                id="crypto-network"
                name="network"
                value={cryptoData.network || 'polygon'}
                onChange={onCryptoChange}
                className="checkout-select"
                data-testid="select-crypto-network"
              >
                <option value="polygon">Polygon (Taxas quase zero)</option>
                <option value="arbitrum">Arbitrum One</option>
                <option value="bsc">BNB Smart Chain (BEP20)</option>
                <option value="ethereum">Ethereum Mainnet</option>
              </select>
            </div>
          </div>

          <div className="checkout-crypto-notice">
            <p>
              💡 Pagamento direto via <strong>NOWPayments</strong>. Ao clicar em Finalizar, você receberá o endereço da carteira e o QR Code compatível com <strong>MetaMask, Trust Wallet e Binance</strong>.
            </p>
          </div>

          {effectiveCryptoDiscount > 0 && (
            <div className="checkout-discount-applied-banner crypto" data-testid="crypto-discount-applied-banner" style={{ marginTop: '12px', padding: '10px 14px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', color: '#3730a3', fontSize: '13px', fontWeight: 600 }}>
              ⚡ Desconto especial de {effectiveCryptoDiscount}% aplicado no pagamento em Cripto!
            </div>
          )}
        </div>
      )}

      {/* Conteúdo de Pagamento Híbrido (Pix + Cartão ou 2 Cartões) */}
      {(paymentMethod === 'hybrid_pix_card' || paymentMethod === 'hybrid_two_cards') && (
        <div className="checkout-tab-content" data-testid="payment-content-hybrid">
          <HybridPaymentForm
            paymentMethod={paymentMethod}
            totalPriceBrl={totalPriceBrl}
            hybridData={hybridData}
            onHybridChange={onHybridChange}
            errors={errors}
          />
        </div>
      )}

      {/* Conteúdo de Boleto Parcelado (Asaas Carnê) */}
      {paymentMethod === 'asaas_installments' && (
        <div className="checkout-tab-content" data-testid="payment-content-asaas-carnet">
          <CheckoutAsaasInstallmentForm
            product={product}
            totalPriceBrl={totalPriceBrl}
            asaasData={asaasData}
            onAsaasChange={onAsaasChange}
          />
        </div>
      )}
    </div>
  );
}
