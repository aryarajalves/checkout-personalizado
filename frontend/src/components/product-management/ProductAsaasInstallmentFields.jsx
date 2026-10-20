import React from 'react';
import { FileText, QrCode, Percent, ShieldCheck } from 'lucide-react';

export default function ProductAsaasInstallmentFields({ formData, setFormData }) {
  const isEnabled = Boolean(formData.enable_asaas_installments);
  const maxInst = parseInt(formData.asaas_max_installments || 12, 10);
  const requireEntryPix = formData.asaas_require_entry_pix !== undefined ? Boolean(formData.asaas_require_entry_pix) : true;

  const handleToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      enable_asaas_installments: checked,
      asaas_max_installments: prev.asaas_max_installments || 12,
      asaas_interest_percent: prev.asaas_interest_percent !== undefined ? prev.asaas_interest_percent : 0,
      asaas_require_entry_pix: prev.asaas_require_entry_pix !== undefined ? prev.asaas_require_entry_pix : true,
    }));
  };

  const handleMaxChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      asaas_max_installments: val,
    }));
  };

  const handleInterestChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setFormData((prev) => ({ ...prev, asaas_interest_percent: '' }));
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 20) num = 20;
    setFormData((prev) => ({ ...prev, asaas_interest_percent: num }));
  };

  const handleEntryPixToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      asaas_require_entry_pix: checked,
    }));
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
      data-testid="asaas-installments-config-section"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#059669" />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            Boleto & Pix Parcelado (Carnê Asaas)
          </h4>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            data-testid="toggle-asaas-installments"
          />
          <span>{isEnabled ? 'Habilitado' : 'Desabilitado'}</span>
        </label>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
        Permita que compradores sem limite no cartão comprem parcelado via Carnê Bancário e BolePix emitidos pelo Asaas.
      </p>

      {isEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                Máximo de Parcelas no Carnê
              </label>
              <select
                className="form-control-modern"
                value={maxInst}
                onChange={handleMaxChange}
                data-testid="select-asaas-max-installments"
                style={{ marginTop: '4px', fontSize: '13px' }}
              >
                {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                  <option key={n} value={n}>
                    Até {n}x mensais
                  </option>
                ))}
              </select>
              <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                Número máximo de parcelas que o comprador poderá escolher.
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                <Percent size={14} color="#059669" />
                <span>Juros / Acréscimo (% a.m.)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="20"
                className="form-control-modern"
                placeholder="0.00"
                value={formData.asaas_interest_percent !== undefined ? formData.asaas_interest_percent : 0}
                onChange={handleInterestChange}
                data-testid="input-asaas-interest-percent"
                style={{ marginTop: '4px', fontSize: '13px' }}
              />
              <span style={{ color: '#64748b', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                Acréscimo percentual cobrado do comprador a cada parcela (0 = sem juros).
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <input
              type="checkbox"
              id="require-entry-pix-toggle"
              checked={requireEntryPix}
              onChange={(e) => handleEntryPixToggle(e.target.checked)}
              data-testid="toggle-asaas-require-entry-pix"
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <div>
              <label
                htmlFor="require-entry-pix-toggle"
                style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <QrCode size={15} color="#059669" />
                Exigir Entrada Imediata via Pix (1ª Parcela)
              </label>
              <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#047857', lineHeight: 1.4 }}>
                Recomendado: o comprador paga a 1ª parcela no Pix para aprovação e liberação imediata do produto. As parcelas seguintes são enviadas por carnê/e-mail com vencimento mensal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
