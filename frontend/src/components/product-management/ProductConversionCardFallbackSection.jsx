import React from 'react';
import { ShieldAlert, Zap, Split, Check } from 'lucide-react';

export default function ProductConversionCardFallbackSection({
  enableCardFallback,
  setEnableCardFallback,
  cardFallbackDiscountPercent,
  setCardFallbackDiscountPercent,
}) {
  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}
      data-testid="product-conversion-card-fallback-section"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="#dc2626" />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
              Fallback Inteligente de Cartão Recusado (#5)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Exibe modal no mesmo segundo em que um cartão é negado pelo banco, salvando a venda via Pix ou 2 Cartões.
            </p>
          </div>
        </div>
        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
          <input
            type="checkbox"
            checked={enableCardFallback}
            onChange={(e) => setEnableCardFallback(e.target.checked)}
            data-testid="toggle-enable-card-fallback"
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: enableCardFallback ? '#16a34a' : '#cbd5e1',
              borderRadius: '22px',
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                content: '""',
                height: '16px',
                width: '16px',
                left: enableCardFallback ? '21px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.2s',
              }}
            />
          </span>
        </label>
      </div>

      {enableCardFallback && (
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Desconto Adicional de Recuperação no Pix (%):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={cardFallbackDiscountPercent}
                onChange={(e) => setCardFallbackDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                placeholder="Ex: 5 ou 10 (0 para desativar)"
                data-testid="card-fallback-discount-input"
                style={{
                  width: '140px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                % de desconto exclusivo para quem converter no Pix após recusa de cartão
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Zap size={15} color="#059669" />
            <span>
              <strong>Garantia de Conversão:</strong> O modal reaproveita nome, e-mail e CPF já digitados, gerando o QR Code Pix em 1 segundo e oferecendo divisão em 2 cartões caso o comprador prefira fatiar o limite.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
