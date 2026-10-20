import React from 'react';
import { MapPin, Search, Loader2, Building, Home } from 'lucide-react';
import { cleanCep } from './viaCepService';

export default function CheckoutBillingAddress({
  billingAddress,
  onChange,
  onCepBlur,
  errors = {},
  loadingCep = false,
  cepNotice = null,
}) {
  const handleZipCodeChange = (e) => {
    const raw = e.target.value;
    onChange('zipCode', raw);
    const digits = cleanCep(raw);
    if (digits.length === 8) {
      onCepBlur(digits);
    }
  };

  return (
    <div className="checkout-step-card" data-testid="checkout-billing-address">
      <div className="checkout-step-header">
        <div
          className="checkout-step-number"
          style={{ backgroundColor: 'var(--checkout-primary, #0284c7)' }}
        >
          <MapPin size={16} />
        </div>
        <div>
          <h3 className="checkout-step-title">Endereço de Cobrança</h3>
          <p className="checkout-step-desc">
            Necessário para validação antifraude da operadora do cartão
          </p>
        </div>
      </div>

      <div className="checkout-form-grid" style={{ marginTop: '16px' }}>
        {/* CEP com Busca Automática */}
        <div className="checkout-field-group full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="checkout-label" htmlFor="billing-zip-code">
              CEP *
            </label>
            {loadingCep && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--checkout-primary, #0284c7)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}
              >
                <Loader2 size={13} className="checkout-spinner" />
                Buscando endereço...
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              className={`checkout-input-wrapper ${errors.zipCode ? 'error' : ''}`}
              style={{ flex: 1 }}
            >
              <input
                id="billing-zip-code"
                name="billing_zip_code"
                type="text"
                placeholder="00000-000"
                maxLength={9}
                value={billingAddress.zipCode || ''}
                onChange={handleZipCodeChange}
                onBlur={() => onCepBlur(billingAddress.zipCode)}
                className="checkout-input"
                data-testid="input-billing-zip-code"
              />
            </div>
            <button
              type="button"
              onClick={() => onCepBlur(billingAddress.zipCode)}
              disabled={loadingCep || cleanCep(billingAddress.zipCode).length !== 8}
              data-testid="btn-lookup-cep"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 16px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: cleanCep(billingAddress.zipCode).length === 8 ? 'pointer' : 'default',
                opacity: cleanCep(billingAddress.zipCode).length === 8 ? 1 : 0.6,
              }}
              title="Buscar endereço pelo CEP"
            >
              <Search size={14} />
              <span>Buscar</span>
            </button>
          </div>
          {errors.zipCode && <span className="checkout-error-text">{errors.zipCode}</span>}
          {cepNotice && (
            <span
              data-testid="cep-notice"
              style={{ color: '#d97706', fontSize: '11.5px', marginTop: '4px', display: 'block' }}
            >
              ⚠️ {cepNotice}
            </span>
          )}
        </div>

        {/* Logradouro / Rua */}
        <div className="checkout-field-group full-width">
          <label className="checkout-label" htmlFor="billing-street">
            Endereço (Rua / Avenida) *
          </label>
          <div className={`checkout-input-wrapper ${errors.street ? 'error' : ''}`}>
            <Home size={16} className="checkout-field-icon" />
            <input
              id="billing-street"
              name="billing_street"
              type="text"
              placeholder="Ex: Av. Paulista, Rua das Flores"
              value={billingAddress.street || ''}
              onChange={(e) => onChange('street', e.target.value)}
              className="checkout-input"
              data-testid="input-billing-street"
            />
          </div>
          {errors.street && <span className="checkout-error-text">{errors.street}</span>}
        </div>

        {/* Número e Complemento */}
        <div className="checkout-field-group">
          <label className="checkout-label" htmlFor="billing-number">
            Número *
          </label>
          <div className={`checkout-input-wrapper ${errors.number ? 'error' : ''}`}>
            <input
              id="billing-number"
              name="billing_number"
              type="text"
              placeholder="123"
              value={billingAddress.number || ''}
              onChange={(e) => onChange('number', e.target.value)}
              className="checkout-input"
              data-testid="input-billing-number"
            />
          </div>
          {errors.number && <span className="checkout-error-text">{errors.number}</span>}
        </div>

        <div className="checkout-field-group">
          <label className="checkout-label" htmlFor="billing-complement">
            Complemento (Opcional)
          </label>
          <div className="checkout-input-wrapper">
            <input
              id="billing-complement"
              name="billing_complement"
              type="text"
              placeholder="Apto 42, Bloco B"
              value={billingAddress.complement || ''}
              onChange={(e) => onChange('complement', e.target.value)}
              className="checkout-input"
              data-testid="input-billing-complement"
            />
          </div>
        </div>

        {/* Bairro, Cidade e UF */}
        <div className="checkout-field-group">
          <label className="checkout-label" htmlFor="billing-neighborhood">
            Bairro *
          </label>
          <div className={`checkout-input-wrapper ${errors.neighborhood ? 'error' : ''}`}>
            <Building size={16} className="checkout-field-icon" />
            <input
              id="billing-neighborhood"
              name="billing_neighborhood"
              type="text"
              placeholder="Centro"
              value={billingAddress.neighborhood || ''}
              onChange={(e) => onChange('neighborhood', e.target.value)}
              className="checkout-input"
              data-testid="input-billing-neighborhood"
            />
          </div>
          {errors.neighborhood && <span className="checkout-error-text">{errors.neighborhood}</span>}
        </div>

        <div className="checkout-field-group">
          <label className="checkout-label" htmlFor="billing-city">
            Cidade *
          </label>
          <div className={`checkout-input-wrapper ${errors.city ? 'error' : ''}`}>
            <input
              id="billing-city"
              name="billing_city"
              type="text"
              placeholder="São Paulo"
              value={billingAddress.city || ''}
              onChange={(e) => onChange('city', e.target.value)}
              className="checkout-input"
              data-testid="input-billing-city"
            />
          </div>
          {errors.city && <span className="checkout-error-text">{errors.city}</span>}
        </div>

        <div className="checkout-field-group" style={{ maxWidth: '100px' }}>
          <label className="checkout-label" htmlFor="billing-state">
            UF *
          </label>
          <div className={`checkout-input-wrapper ${errors.state ? 'error' : ''}`}>
            <input
              id="billing-state"
              name="billing_state"
              type="text"
              placeholder="SP"
              maxLength={2}
              value={billingAddress.state || ''}
              onChange={(e) => onChange('state', e.target.value)}
              className="checkout-input"
              style={{ textTransform: 'uppercase', textAlign: 'center' }}
              data-testid="input-billing-state"
            />
          </div>
          {errors.state && <span className="checkout-error-text">{errors.state}</span>}
        </div>
      </div>
    </div>
  );
}
