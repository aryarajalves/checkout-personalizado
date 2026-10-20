import React, { useState } from 'react';

export default function BuyerCardUpdateModal({ subscription, onClose, onUpdateCard, loading }) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  if (!subscription) return null;

  // Formatação de número do cartão (grupos de 4)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Formatação de validade MM/AA
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExpiry(raw);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 13) return;
    if (!cardHolder.trim()) return;
    if (cardExpiry.length < 5) return;
    if (cardCvv.length < 3) return;

    onUpdateCard(subscription.subscription_code, {
      card_number: cleanNum,
      card_holder: cardHolder.trim().toUpperCase(),
      card_expiry: cardExpiry,
      card_cvv: cardCvv,
    });
  };

  return (
    <div className="buyer-modal-backdrop" role="dialog" aria-modal="true">
      <div className="buyer-modal-panel">
        <div className="buyer-modal-header">
          <div className="buyer-modal-title-group">
            <span className="card-icon-badge">💳 Cartão</span>
            <h2 className="buyer-modal-title">Atualizar Cartão de Crédito</h2>
          </div>
          <button
            type="button"
            className="buyer-modal-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar modal de troca de cartão"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="buyer-modal-form" noValidate>
          <div className="buyer-modal-body">
            <div className="sub-target-info-card">
              <span className="sub-info-label">Assinatura:</span>
              <strong className="sub-info-title">{subscription.product_name}</strong>
              <span className="sub-info-code">({subscription.subscription_code})</span>
              <p className="sub-info-hint">
                As próximas renovações da assinatura serão cobradas automaticamente neste novo cartão.
              </p>
            </div>

            <div className="buyer-form-group">
              <label htmlFor="card-number-input" className="buyer-form-label">
                Número do Novo Cartão <span className="required-asterisk">*</span>
              </label>
              <div className="buyer-input-wrapper">
                <svg className="buyer-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <input
                  id="card-number-input"
                  type="text"
                  className="buyer-input-field"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="buyer-form-group">
              <label htmlFor="card-holder-input" className="buyer-form-label">
                Nome Impresso no Cartão <span className="required-asterisk">*</span>
              </label>
              <div className="buyer-input-wrapper">
                <svg className="buyer-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="card-holder-input"
                  type="text"
                  className="buyer-input-field"
                  placeholder="NOME COMO NO CARTÃO"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="buyer-form-row-2">
              <div className="buyer-form-group">
                <label htmlFor="card-expiry-input" className="buyer-form-label">
                  Validade (MM/AA) <span className="required-asterisk">*</span>
                </label>
                <input
                  id="card-expiry-input"
                  type="text"
                  className="buyer-input-field"
                  placeholder="12/28"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="buyer-form-group">
                <label htmlFor="card-cvv-input" className="buyer-form-label">
                  CVV / CVC <span className="required-asterisk">*</span>
                </label>
                <input
                  id="card-cvv-input"
                  type="password"
                  maxLength={4}
                  className="buyer-input-field"
                  placeholder="123"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="buyer-auth-security-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Dados protegidos por tokenização PCI-DSS compliance</span>
            </div>
          </div>

          <div className="buyer-modal-footer">
            <button
              type="button"
              className="buyer-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="buyer-btn-primary"
              disabled={loading || cardNumber.length < 16 || !cardHolder.trim() || cardExpiry.length < 5 || cardCvv.length < 3}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" />
                  Salvando Cartão...
                </>
              ) : (
                'Salvar Novo Cartão'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
