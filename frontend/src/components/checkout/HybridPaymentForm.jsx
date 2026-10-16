import React from 'react';
import { CreditCard, QrCode, Split, Info } from 'lucide-react';
import { maskCardNumber, maskCardExpiry, formatCurrency } from './checkoutUtils';
import '../../styles/checkout-hybrid.css';

export default function HybridPaymentForm({
  paymentMethod,
  totalPriceBrl = 0,
  hybridData = {},
  onHybridChange,
  errors = {}
}) {
  const {
    pixAmount = Math.round((totalPriceBrl / 2) * 100) / 100,
    cardAmount = Math.round((totalPriceBrl / 2) * 100) / 100,
    card2Amount = Math.round((totalPriceBrl / 2) * 100) / 100,
    cardData = {},
    card2Data = {}
  } = hybridData;

  const handlePixAmountChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    const clampedPix = Math.min(Math.max(0, val), totalPriceBrl);
    const calculatedCard = Math.max(0, Math.round((totalPriceBrl - clampedPix) * 100) / 100);
    onHybridChange({
      ...hybridData,
      pixAmount: clampedPix,
      cardAmount: calculatedCard
    });
  };

  const handleCardAmountChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    const clampedCard = Math.min(Math.max(0, val), totalPriceBrl);
    if (paymentMethod === 'hybrid_pix_card') {
      const calculatedPix = Math.max(0, Math.round((totalPriceBrl - clampedCard) * 100) / 100);
      onHybridChange({
        ...hybridData,
        cardAmount: clampedCard,
        pixAmount: calculatedPix
      });
    } else {
      // 2 cartões: cartão 1 altera, cartão 2 recalcula
      const calculatedCard2 = Math.max(0, Math.round((totalPriceBrl - clampedCard) * 100) / 100);
      onHybridChange({
        ...hybridData,
        cardAmount: clampedCard,
        card2Amount: calculatedCard2
      });
    }
  };

  const handleCard2AmountChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    const clampedCard2 = Math.min(Math.max(0, val), totalPriceBrl);
    const calculatedCard1 = Math.max(0, Math.round((totalPriceBrl - clampedCard2) * 100) / 100);
    onHybridChange({
      ...hybridData,
      card2Amount: clampedCard2,
      cardAmount: calculatedCard1
    });
  };

  const applyPresetRatio = (ratio1) => {
    const part1 = Math.round(totalPriceBrl * ratio1 * 100) / 100;
    const part2 = Math.max(0, Math.round((totalPriceBrl - part1) * 100) / 100);
    if (paymentMethod === 'hybrid_pix_card') {
      onHybridChange({
        ...hybridData,
        pixAmount: part1,
        cardAmount: part2
      });
    } else {
      onHybridChange({
        ...hybridData,
        cardAmount: part1,
        card2Amount: part2
      });
    }
  };

  const updateCard1Field = (field, value) => {
    onHybridChange({
      ...hybridData,
      cardData: {
        ...cardData,
        [field]: value
      }
    });
  };

  const updateCard2Field = (field, value) => {
    onHybridChange({
      ...hybridData,
      card2Data: {
        ...card2Data,
        [field]: value
      }
    });
  };

  // Parcelamento dinâmico baseado no valor alocado ao cartão
  const generateInstallments = (amount) => {
    const effectiveAmount = amount || 0;
    return Array.from({ length: 12 }, (_, i) => {
      const count = i + 1;
      const installmentVal = effectiveAmount / count;
      return {
        count,
        label: `${count}x de ${formatCurrency(installmentVal, 'BRL')} ${count === 1 ? 'à vista' : 'sem juros'}`
      };
    });
  };

  return (
    <div className="hybrid-payment-container" data-testid="hybrid-payment-container">
      {/* Box de divisão de valores */}
      <div className="hybrid-split-box">
        <div className="hybrid-split-header">
          <div className="hybrid-split-title">
            <Split size={16} />
            <span>Defina a Divisão do Pagamento (Total: {formatCurrency(totalPriceBrl, 'BRL')})</span>
          </div>
        </div>

        <div className="hybrid-split-presets">
          <button
            type="button"
            className="hybrid-preset-btn"
            onClick={() => applyPresetRatio(0.5)}
            data-testid="preset-50-50"
          >
            50% / 50%
          </button>
          <button
            type="button"
            className="hybrid-preset-btn"
            onClick={() => applyPresetRatio(0.3)}
            data-testid="preset-30-70"
          >
            {paymentMethod === 'hybrid_pix_card' ? '30% Pix / 70% Cartão' : '30% / 70%'}
          </button>
          <button
            type="button"
            className="hybrid-preset-btn"
            onClick={() => applyPresetRatio(0.2)}
            data-testid="preset-20-80"
          >
            {paymentMethod === 'hybrid_pix_card' ? '20% Pix / 80% Cartão' : '20% / 80%'}
          </button>
        </div>

        <div className="hybrid-amounts-grid">
          {paymentMethod === 'hybrid_pix_card' ? (
            <>
              <div className="hybrid-amount-card">
                <span className="hybrid-amount-label">Entrada no Pix</span>
                <div className="hybrid-amount-input-wrapper">
                  <span className="hybrid-currency-prefix">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={pixAmount}
                    onChange={handlePixAmountChange}
                    className="hybrid-amount-input"
                    data-testid="input-hybrid-pix-amount"
                  />
                </div>
              </div>
              <div className="hybrid-amount-card">
                <span className="hybrid-amount-label">Restante no Cartão</span>
                <div className="hybrid-amount-input-wrapper">
                  <span className="hybrid-currency-prefix">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={cardAmount}
                    onChange={handleCardAmountChange}
                    className="hybrid-amount-input"
                    data-testid="input-hybrid-card-amount"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="hybrid-amount-card">
                <span className="hybrid-amount-label">Valor no Cartão 1</span>
                <div className="hybrid-amount-input-wrapper">
                  <span className="hybrid-currency-prefix">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={cardAmount}
                    onChange={handleCardAmountChange}
                    className="hybrid-amount-input"
                    data-testid="input-hybrid-card1-amount"
                  />
                </div>
              </div>
              <div className="hybrid-amount-card">
                <span className="hybrid-amount-label">Valor no Cartão 2</span>
                <div className="hybrid-amount-input-wrapper">
                  <span className="hybrid-currency-prefix">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={card2Amount}
                    onChange={handleCard2AmountChange}
                    className="hybrid-amount-input"
                    data-testid="input-hybrid-card2-amount"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {paymentMethod === 'hybrid_pix_card' && (
          <div className="hybrid-notice">
            <Info size={14} />
            <span>Após aprovar o cartão, o QR Code do Pix de <strong>{formatCurrency(pixAmount, 'BRL')}</strong> será exibido para você concluir a compra.</span>
          </div>
        )}
      </div>

      {/* Formulário do Cartão 1 */}
      <div className="hybrid-card-section">
        <div className="hybrid-card-divider">
          <CreditCard size={16} />
          <span>{paymentMethod === 'hybrid_two_cards' ? 'Dados do Cartão de Crédito 1' : 'Dados do Cartão de Crédito'}</span>
        </div>

        <div className="checkout-card-form-grid">
          <div className="checkout-field-group full-width">
            <label className="checkout-label" htmlFor="hybrid-card-number">Número do Cartão</label>
            <input
              id="hybrid-card-number"
              type="text"
              placeholder="0000 0000 0000 0000"
              value={cardData.cardNumber || ''}
              onChange={(e) => updateCard1Field('cardNumber', maskCardNumber(e.target.value))}
              className={`checkout-input ${errors.cardNumber ? 'error' : ''}`}
              data-testid="input-hybrid-card-number"
            />
            {errors.cardNumber && <span className="checkout-error-text">{errors.cardNumber}</span>}
          </div>

          <div className="checkout-field-group full-width">
            <label className="checkout-label" htmlFor="hybrid-card-holder">Nome Impresso no Cartão</label>
            <input
              id="hybrid-card-holder"
              type="text"
              placeholder="Como gravado no cartão"
              value={cardData.cardHolder || ''}
              onChange={(e) => updateCard1Field('cardHolder', e.target.value)}
              className={`checkout-input ${errors.cardHolder ? 'error' : ''}`}
              data-testid="input-hybrid-card-holder"
            />
            {errors.cardHolder && <span className="checkout-error-text">{errors.cardHolder}</span>}
          </div>

          <div className="checkout-field-group">
            <label className="checkout-label" htmlFor="hybrid-card-expiry">Validade (MM/AA)</label>
            <input
              id="hybrid-card-expiry"
              type="text"
              placeholder="MM/AA"
              value={cardData.cardExpiry || ''}
              onChange={(e) => updateCard1Field('cardExpiry', maskCardExpiry(e.target.value))}
              className={`checkout-input ${errors.cardExpiry ? 'error' : ''}`}
              data-testid="input-hybrid-card-expiry"
            />
            {errors.cardExpiry && <span className="checkout-error-text">{errors.cardExpiry}</span>}
          </div>

          <div className="checkout-field-group">
            <label className="checkout-label" htmlFor="hybrid-card-cvv">CVV</label>
            <input
              id="hybrid-card-cvv"
              type="password"
              maxLength={4}
              placeholder="123"
              value={cardData.cardCvv || ''}
              onChange={(e) => updateCard1Field('cardCvv', e.target.value)}
              className={`checkout-input ${errors.cardCvv ? 'error' : ''}`}
              data-testid="input-hybrid-card-cvv"
            />
            {errors.cardCvv && <span className="checkout-error-text">{errors.cardCvv}</span>}
          </div>

          <div className="checkout-field-group full-width">
            <label className="checkout-label" htmlFor="hybrid-card-installments">Parcelamento do Cartão</label>
            <select
              id="hybrid-card-installments"
              value={cardData.installments || 1}
              onChange={(e) => updateCard1Field('installments', parseInt(e.target.value, 10))}
              className="checkout-select"
              data-testid="select-hybrid-card-installments"
            >
              {generateInstallments(cardAmount).map((opt) => (
                <option key={opt.count} value={opt.count}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Formulário do Cartão 2 (Se paymentMethod === 'hybrid_two_cards') */}
      {paymentMethod === 'hybrid_two_cards' && (
        <div className="hybrid-card-section" style={{ marginTop: 24 }}>
          <div className="hybrid-card-divider hybrid-card2-divider">
            <CreditCard size={16} />
            <span>Dados do Cartão de Crédito 2</span>
          </div>

          <div className="checkout-card-form-grid">
            <div className="checkout-field-group full-width">
              <label className="checkout-label" htmlFor="hybrid-card2-number">Número do Cartão 2</label>
              <input
                id="hybrid-card2-number"
                type="text"
                placeholder="0000 0000 0000 0000"
                value={card2Data.cardNumber || ''}
                onChange={(e) => updateCard2Field('cardNumber', maskCardNumber(e.target.value))}
                className={`checkout-input ${errors.card2Number ? 'error' : ''}`}
                data-testid="input-hybrid-card2-number"
              />
              {errors.card2Number && <span className="checkout-error-text">{errors.card2Number}</span>}
            </div>

            <div className="checkout-field-group full-width">
              <label className="checkout-label" htmlFor="hybrid-card2-holder">Nome Impresso no Cartão 2</label>
              <input
                id="hybrid-card2-holder"
                type="text"
                placeholder="Como gravado no cartão"
                value={card2Data.cardHolder || ''}
                onChange={(e) => updateCard2Field('cardHolder', e.target.value)}
                className={`checkout-input ${errors.card2Holder ? 'error' : ''}`}
                data-testid="input-hybrid-card2-holder"
              />
              {errors.card2Holder && <span className="checkout-error-text">{errors.card2Holder}</span>}
            </div>

            <div className="checkout-field-group">
              <label className="checkout-label" htmlFor="hybrid-card2-expiry">Validade (MM/AA)</label>
              <input
                id="hybrid-card2-expiry"
                type="text"
                placeholder="MM/AA"
                value={card2Data.cardExpiry || ''}
                onChange={(e) => updateCard2Field('cardExpiry', maskCardExpiry(e.target.value))}
                className={`checkout-input ${errors.card2Expiry ? 'error' : ''}`}
                data-testid="input-hybrid-card2-expiry"
              />
              {errors.card2Expiry && <span className="checkout-error-text">{errors.card2Expiry}</span>}
            </div>

            <div className="checkout-field-group">
              <label className="checkout-label" htmlFor="hybrid-card2-cvv">CVV</label>
              <input
                id="hybrid-card2-cvv"
                type="password"
                maxLength={4}
                placeholder="123"
                value={card2Data.cardCvv || ''}
                onChange={(e) => updateCard2Field('cardCvv', e.target.value)}
                className={`checkout-input ${errors.card2Cvv ? 'error' : ''}`}
                data-testid="input-hybrid-card2-cvv"
              />
              {errors.card2Cvv && <span className="checkout-error-text">{errors.card2Cvv}</span>}
            </div>

            <div className="checkout-field-group full-width">
              <label className="checkout-label" htmlFor="hybrid-card2-installments">Parcelamento do Cartão 2</label>
              <select
                id="hybrid-card2-installments"
                value={card2Data.installments || 1}
                onChange={(e) => updateCard2Field('installments', parseInt(e.target.value, 10))}
                className="checkout-select"
                data-testid="select-hybrid-card2-installments"
              >
                {generateInstallments(card2Amount).map((opt) => (
                  <option key={opt.count} value={opt.count}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
