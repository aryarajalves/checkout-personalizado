import React from 'react';
import { ShieldCheck, MapPin } from 'lucide-react';

export default function ProductRequirementFields({ formData, setFormData }) {
  return (
    <div className="product-requirements-container" data-testid="product-requirements-fields" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
      {/* Exigir CPF */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <input
          type="checkbox"
          id="product-require-cpf-toggle"
          checked={Boolean(formData.require_cpf)}
          onChange={() => setFormData((p) => ({ ...p, require_cpf: !p.require_cpf }))}
          data-testid="toggle-product-require-cpf"
          style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer', marginTop: '2px' }}
        />
        <div>
          <label htmlFor="product-require-cpf-toggle" style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} style={{ color: '#0284c7' }} />
            <span>Exigir CPF do comprador no checkout</span>
          </label>
          <span style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', display: 'block' }}>
            Por padrão, o CPF é opcional para maior conversão. Ative se precisar do documento para emissão fiscal.
          </span>
        </div>
      </div>

      {/* Exigir Endereço de Cobrança (ViaCEP / Antifraude) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <input
          type="checkbox"
          id="product-require-billing-address-toggle"
          checked={Boolean(formData.require_billing_address)}
          onChange={() => setFormData((p) => ({ ...p, require_billing_address: !p.require_billing_address }))}
          data-testid="toggle-product-require-billing-address"
          style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer', marginTop: '2px' }}
        />
        <div>
          <label htmlFor="product-require-billing-address-toggle" style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={15} style={{ color: '#0284c7' }} />
            <span>Exigir Endereço de Cobrança & Antifraude (ViaCEP)</span>
          </label>
          <span style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', display: 'block' }}>
            Solicita CEP e endereço de cobrança completo no Cartão com preenchimento automático para maximizar aprovação em tickets altos.
          </span>
        </div>
      </div>
    </div>
  );
}
