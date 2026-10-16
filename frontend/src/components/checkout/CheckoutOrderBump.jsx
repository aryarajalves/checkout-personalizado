import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { formatCurrency } from './checkoutUtils';

export default function CheckoutOrderBump({
  bumps = [],
  selectedBumpIds = [],
  onToggleBump,
}) {
  const activeBumps = bumps.filter((b) => b.is_active);

  if (activeBumps.length === 0) return null;

  return (
    <div className="checkout-order-bumps-section" data-testid="checkout-order-bumps-section" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Sparkles size={18} color="#16a34a" />
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
          Turbine seu Pedido (Ofertas Especiais)
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeBumps.map((bump) => {
          const isSelected = selectedBumpIds.includes(bump.id);

          return (
            <div
              key={bump.id}
              data-testid={`bump-card-${bump.id}`}
              onClick={() => onToggleBump && onToggleBump(bump.id)}
              style={{
                border: isSelected ? '2px solid #16a34a' : '2px dashed #cbd5e1',
                backgroundColor: isSelected ? '#f0fdf4' : '#f8fafc',
                borderRadius: '12px',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                userSelect: 'none',
              }}
            >
              {/* Checkbox Visual Customizado */}
              <div
                data-testid={`bump-checkbox-${bump.id}`}
                style={{
                  minWidth: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  border: isSelected ? '2px solid #16a34a' : '2px solid #94a3b8',
                  backgroundColor: isSelected ? '#16a34a' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '2px',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </div>

              {/* Informações da Oferta */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: isSelected ? '#15803d' : '#64748b',
                      backgroundColor: isSelected ? '#dcfce7' : '#e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    OFERTA COMPLEMENTAR
                  </span>

                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#15803d',
                    }}
                  >
                    + {formatCurrency(bump.price_brl, 'BRL')}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginTop: '4px',
                    marginBottom: '4px',
                  }}
                >
                  {bump.title}
                </div>

                {bump.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: 1.45,
                    }}
                  >
                    {bump.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
