import React from 'react';
import { User, Mail, FileText } from 'lucide-react';
import { maskCpf } from './checkoutUtils';
import CheckoutPhoneInput from './CheckoutPhoneInput';

export default function CheckoutCustomerForm({ formData, onChange, errors = {}, requireCpf = false }) {
  const handleCpfChange = (e) => {
    const masked = maskCpf(e.target.value);
    onChange({ target: { name: 'cpf', value: masked } });
  };

  const handlePhoneChange = (e) => {
    const masked = maskPhone(e.target.value);
    onChange({ target: { name: 'phone', value: masked } });
  };

  return (
    <div className="checkout-step-card" data-testid="checkout-customer-form">
      <div className="checkout-step-header">
        <div className="checkout-step-number">1</div>
        <div>
          <h3 className="checkout-step-title">Dados Pessoais</h3>
          <p className="checkout-step-desc">Informe seus dados para receber o acesso ao produto</p>
        </div>
      </div>

      <div className="checkout-form-grid">
        {/* Nome Completo */}
        <div className={`checkout-field-group ${!requireCpf ? 'full-width' : ''}`}>
          <label className="checkout-label" htmlFor="checkout-name">
            Nome Completo
          </label>
          <div className={`checkout-input-wrapper ${errors.name ? 'error' : ''}`}>
            <User size={16} className="checkout-field-icon" />
            <input
              id="checkout-name"
              name="name"
              type="text"
              placeholder="Ex: João da Silva"
              value={formData.name || ''}
              onChange={onChange}
              className="checkout-input"
              data-testid="checkout-input-name"
            />
          </div>
          {errors.name && <span className="checkout-error-text">{errors.name}</span>}
        </div>

        {/* E-mail */}
        <div className="checkout-field-group">
          <label className="checkout-label" htmlFor="checkout-email">
            E-mail
          </label>
          <div className={`checkout-input-wrapper ${errors.email ? 'error' : ''}`}>
            <Mail size={16} className="checkout-field-icon" />
            <input
              id="checkout-email"
              name="email"
              type="email"
              placeholder="seu.email@exemplo.com"
              value={formData.email || ''}
              onChange={onChange}
              className="checkout-input"
              data-testid="checkout-input-email"
            />
          </div>
          {errors.email && <span className="checkout-error-text">{errors.email}</span>}
        </div>

        {/* WhatsApp / Celular */}
        <div className="checkout-field-group">
          <label className="checkout-label" htmlFor="checkout-phone">
            Celular / WhatsApp
          </label>
          <CheckoutPhoneInput
            phone={formData.phone || ''}
            phoneDdi={formData.phone_ddi || '55'}
            onChange={(val) => onChange({ target: { name: 'phone', value: val } })}
            onDdiChange={(ddi) => onChange({ target: { name: 'phone_ddi', value: ddi } })}
            hasError={Boolean(errors.phone)}
          />
          {errors.phone && <span className="checkout-error-text">{errors.phone}</span>}
        </div>

        {/* CPF (Opcional por Produto) */}
        {requireCpf && (
          <div className="checkout-field-group">
            <label className="checkout-label" htmlFor="checkout-cpf">
              CPF
            </label>
            <div className={`checkout-input-wrapper ${errors.cpf ? 'error' : ''}`}>
              <FileText size={16} className="checkout-field-icon" />
              <input
                id="checkout-cpf"
                name="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf || ''}
                onChange={handleCpfChange}
                className="checkout-input"
                data-testid="checkout-input-cpf"
              />
            </div>
            {errors.cpf && <span className="checkout-error-text">{errors.cpf}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
