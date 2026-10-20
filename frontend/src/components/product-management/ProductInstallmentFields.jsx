import React from 'react';
import { CreditCard, HelpCircle, Percent } from 'lucide-react';

export default function ProductInstallmentFields({ formData, setFormData }) {
  const maxInst = parseInt(formData.max_installments || 12, 10);
  const freeInst = parseInt(formData.free_installments_count || 1, 10);

  const handleMaxChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      max_installments: val,
      // Se as parcelas sem juros forem maiores que o novo máximo, ajusta automaticamente
      free_installments_count: Math.min(prev.free_installments_count || 1, val),
    }));
  };

  const handleFreeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      free_installments_count: val,
    }));
  };

  const handleInterestRateChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setFormData((prev) => ({ ...prev, interest_rate_percent: '' }));
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 20) num = 20;
    setFormData((prev) => ({ ...prev, interest_rate_percent: num }));
  };

  const handlePayerChange = (payer) => {
    setFormData((prev) => ({ ...prev, interest_payer: payer }));
  };

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
      }}
      data-testid="installment-rules-config-section"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <CreditCard size={18} color="#0284c7" />
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
          Regras de Parcelamento no Cartão de Crédito
        </h4>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
        Defina o limite de parcelas para este produto, quantas são sem juros e a taxa mensal para proteger sua margem.
      </p>

      {/* Grid: Máximo de Parcelas e Parcelas Sem Juros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            <span>Limite Máximo de Parcelas</span>
          </label>
          <select
            className="form-control-modern"
            value={formData.max_installments || 12}
            onChange={handleMaxChange}
            data-testid="select-product-max-installments"
            style={{ marginTop: '4px', fontSize: '13px' }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Até {n}x {n === 1 ? '(Somente à vista)' : ''}
              </option>
            ))}
          </select>
          <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
            Máximo permitido no checkout
          </span>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            <span>Parcelas Sem Juros ao Comprador</span>
          </label>
          <select
            className="form-control-modern"
            value={formData.free_installments_count || 1}
            onChange={handleFreeChange}
            data-testid="select-product-free-installments"
            style={{ marginTop: '4px', fontSize: '13px' }}
          >
            {Array.from({ length: maxInst }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? '1x (Apenas à vista sem juros)' : `Até ${n}x sem juros`}
              </option>
            ))}
          </select>
          <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
            Acima disso, incidirão os juros mensais
          </span>
        </div>
      </div>

      {/* Taxa de Juros Mensal e Repasse */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            <Percent size={14} color="#0284c7" />
            <span>Taxa de Juros (% a.m.)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="20"
            className="form-control-modern"
            placeholder="2.99"
            value={formData.interest_rate_percent !== undefined ? formData.interest_rate_percent : 2.99}
            onChange={handleInterestRateChange}
            data-testid="input-product-interest-rate"
            style={{ marginTop: '4px', fontSize: '13px' }}
          />
          <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
            Padrão de mercado: 2.99% a.m.
          </span>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            <span>Quem Arca com os Juros?</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className={`product-status-btn ${(formData.interest_payer || 'buyer') === 'buyer' ? 'active' : ''}`}
              onClick={() => handlePayerChange('buyer')}
              data-testid="btn-interest-payer-buyer"
              style={{ flex: 1, padding: '7px 8px', fontSize: '11px', textAlign: 'center' }}
            >
              Comprador (Padrão)
            </button>
            <button
              type="button"
              className={`product-status-btn ${formData.interest_payer === 'producer' ? 'active' : ''}`}
              onClick={() => handlePayerChange('producer')}
              data-testid="btn-interest-payer-producer"
              style={{ flex: 1, padding: '7px 8px', fontSize: '11px', textAlign: 'center' }}
            >
              Produtor Absorve
            </button>
          </div>
          <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
            {(formData.interest_payer || 'buyer') === 'buyer'
              ? 'O comprador paga o acréscimo das parcelas.'
              : 'O produtor assume a taxa de parcelamento.'}
          </span>
        </div>
      </div>
    </div>
  );
}
