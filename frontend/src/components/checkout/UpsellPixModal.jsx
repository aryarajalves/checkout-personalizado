import React, { useState } from 'react';
import { QrCode, Copy, Check, X, Loader2, CreditCard } from 'lucide-react';
import { formatCurrency } from './checkoutUtils';

export default function UpsellPixModal({
  isOpen,
  onClose,
  pixData,
  onSwitchToCard,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !pixData) return null;

  const handleCopy = () => {
    if (pixData.qr_code_text) {
      navigator.clipboard.writeText(pixData.qr_code_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="upsell-pix-modal-overlay"
      style={{ zIndex: 1200, backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="upsell-pix-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', textAlign: 'center', padding: '28px 24px', backgroundColor: '#ffffff', borderRadius: '16px', color: '#0f172a' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={20} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Pagamento via Pix
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-upsell-pix-modal-btn"
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '16px', lineHeight: 1.4 }}>
          Escaneie o QR Code ou copie o código Pix abaixo para liberar seu acesso imediatamente.
        </p>

        <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a', marginBottom: '16px' }}>
          {formatCurrency(pixData.amount_brl, 'BRL')}
        </div>

        {/* QR Code */}
        {pixData.qr_code_base64 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <img
              src={pixData.qr_code_base64}
              alt="QR Code Pix"
              data-testid="upsell-pix-qr-image"
              style={{ width: '180px', height: '180px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px' }}
            />
          </div>
        )}

        {/* Copia e Cola */}
        {pixData.qr_code_text && (
          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={handleCopy}
              data-testid="btn-copy-upsell-pix"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: copied ? '#16a34a' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease',
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Código Pix Copiado!' : 'Copiar Código Pix Copia e Cola'}</span>
            </button>
          </div>
        )}

        {/* Status de Polling */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '12.5px', marginBottom: '18px' }}>
          <Loader2 size={16} className="spinning-icon" />
          <span>Aguardando confirmação do pagamento...</span>
        </div>

        {/* Alternativa para Cartão de Crédito */}
        {onSwitchToCard && (
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <button
              type="button"
              onClick={onSwitchToCard}
              data-testid="btn-switch-to-card"
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={15} />
              <span>Prefiro pagar com Cartão de Crédito</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
