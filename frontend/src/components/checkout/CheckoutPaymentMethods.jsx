import React from 'react';
import { QrCode, CreditCard, Coins, CheckCircle2, Split, Layers } from 'lucide-react';
import { maskCardNumber, maskCardExpiry, formatCurrency } from './checkoutUtils';
import HybridPaymentForm from './HybridPaymentForm';

export default function CheckoutPaymentMethods({
  paymentMethod,
  onSelectMethod,
  cardData,
  onCardChange,
  cryptoData,
  onCryptoChange,
  hybridData,
  onHybridChange,
  totalPriceBrl = 0,
  errors = {}
}) {
  const handleCardNumber = (e) => {
    const masked = maskCardNumber(e.target.value);
    onCardChange({ target: { name: 'cardNumber', value: masked } });
  };

  const handleCardExpiry = (e) => {
    const masked = maskCardExpiry(e.target.value);
    onCardChange({ target: { name: 'cardExpiry', value: masked } });
  };

  // Gerar opções de parcelamento de 1x a 12x
  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const installments = i + 1;
    const installmentVal = totalPriceBrl / installments;
    return {
      installments,
      label: `${installments}x de ${formatCurrency(installmentVal, 'BRL')} ${installments === 1 ? 'à vista' : 'sem juros'}`
    };
  });

  return (
    <div className="checkout-step-card" data-testid="checkout-payment-methods">
      <div className="checkout-step-header">
        <div className="checkout-step-number">2</div>
        <div>
          <h3 className="checkout-step-title">Forma de Pagamento</h3>
          <p className="checkout-step-desc">Selecione o método desejado para efetuar a compra</p>
        </div>
      </div>

      {/* Abas de Pagamento */}
      <div className="checkout-payment-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={paymentMethod === 'pix'}
          className={`checkout-payment-tab ${paymentMethod === 'pix' ? 'active' : ''}`}
          onClick={() => onSelectMethod('pix')}
          data-testid="tab-payment-pix"
        >
          <div className="checkout-tab-icon-box pix">
            <QrCode size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Pix</span>
            <span className="checkout-tab-sub">Imediato</span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={paymentMethod === 'credit_card'}
          className={`checkout-payment-tab ${paymentMethod === 'credit_card' ? 'active' : ''}`}
          onClick={() => onSelectMethod('credit_card')}
          data-testid="tab-payment-card"
        >
          <div className="checkout-tab-icon-box card">
            <CreditCard size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Cartão</span>
            <span className="checkout-tab-sub">Até 12x</span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={paymentMethod === 'crypto'}
          className={`checkout-payment-tab ${paymentMethod === 'crypto' ? 'active' : ''}`}
          onClick={() => onSelectMethod('crypto')}
          data-testid="tab-payment-crypto"
        >
          <div className="checkout-tab-icon-box crypto">
            <Coins size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Cripto</span>
            <span className="checkout-tab-sub">MetaMask</span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={paymentMethod === 'hybrid_pix_card'}
          className={`checkout-payment-tab ${paymentMethod === 'hybrid_pix_card' ? 'active' : ''}`}
          onClick={() => onSelectMethod('hybrid_pix_card')}
          data-testid="tab-payment-hybrid-pix-card"
        >
          <div className="checkout-tab-icon-box pix">
            <Split size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">Pix + Cartão</span>
            <span className="checkout-tab-sub">Entrada + 12x</span>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={paymentMethod === 'hybrid_two_cards'}
          className={`checkout-payment-tab ${paymentMethod === 'hybrid_two_cards' ? 'active' : ''}`}
          onClick={() => onSelectMethod('hybrid_two_cards')}
          data-testid="tab-payment-hybrid-two-cards"
        >
          <div className="checkout-tab-icon-box card">
            <Layers size={18} />
          </div>
          <div className="checkout-tab-text">
            <span className="checkout-tab-title">2 Cartões</span>
            <span className="checkout-tab-sub">Dividir limite</span>
          </div>
        </button>
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
    </div>
  );
}
