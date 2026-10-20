import React from 'react';
import { Tag, Sparkles, X, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ExitIntentModal({
  isOpen,
  onClose,
  onApplyDiscount,
  title = 'Espere! Não perca esta oportunidade exclusiva',
  subtitle = 'Liberamos um desconto especial de última chance para você concluir seu pedido agora!',
  couponCode,
  discountPercent,
  primaryColor = '#0284c7',
}) {
  if (!isOpen) return null;

  const handleApply = () => {
    if (couponCode && onApplyDiscount) {
      onApplyDiscount(couponCode);
    }
    onClose();
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="exit-intent-modal-overlay"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="exit-intent-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          position: 'relative',
          textAlign: 'center',
          animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Barra superior de destaque */}
        <div
          style={{
            height: '6px',
            width: '100%',
            background: `linear-gradient(90deg, #f59e0b, #ef4444, #ec4899, #8b5cf6)`,
          }}
        />

        {/* Botão de Fechar */}
        <button
          type="button"
          onClick={onClose}
          data-testid="close-exit-intent-btn"
          aria-label="Fechar"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
        >
          <X size={16} />
        </button>

        <div style={{ padding: '32px 28px 28px' }}>
          {/* Badge de Alerta / Ícone de Desconto */}
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 8px #fffbeb',
            }}
          >
            <Sparkles size={32} />
          </div>

          {/* Destaque de Porcentagem */}
          {discountPercent ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '12px',
                border: '1px solid #a7f3d0',
              }}
            >
              <Tag size={14} />
              <span>{discountPercent}% DE DESCONTO EXCLUSIVO</span>
            </div>
          ) : null}

          {/* Título Principal */}
          <h3
            data-testid="exit-intent-title"
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 10px 0',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h3>

          {/* Subtítulo */}
          <p
            data-testid="exit-intent-subtitle"
            style={{
              fontSize: '14px',
              color: '#475569',
              margin: '0 0 20px 0',
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>

          {/* Caixa do Código do Cupom */}
          {couponCode && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '12px 16px',
                margin: '0 0 24px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Cupom Aplicado Automaticamente
                </span>
                <span
                  data-testid="exit-intent-coupon-code"
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#0f172a',
                    fontFamily: 'monospace',
                  }}
                >
                  {couponCode}
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#059669',
                  backgroundColor: '#d1fae5',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                Ativo
              </span>
            </div>
          )}

          {/* Botão de Ação Principal: Aplicar Desconto */}
          <button
            type="button"
            onClick={handleApply}
            data-testid="apply-exit-intent-discount-btn"
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
              transition: 'transform 0.15s ease, background-color 0.15s ease',
              marginBottom: '12px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
          >
            <span>
              {discountPercent
                ? `SIM, QUERO MEU DESCONTO DE ${discountPercent}%`
                : 'SIM, QUERO MEU DESCONTO AGORA'}
            </span>
            <ArrowRight size={18} />
          </button>

          {/* Botão Secundário: Cancelar / Não obrigado */}
          <button
            type="button"
            onClick={onClose}
            data-testid="reject-exit-intent-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '6px 12px',
              textDecoration: 'underline',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#64748b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Não, obrigado. Prefiro continuar sem o desconto.
          </button>

          {/* Selo de Garantia e Segurança */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '16px',
              fontSize: '11px',
              color: '#64748b',
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            <span>Pagamento seguro e criptografado • Garantia incondicional</span>
          </div>
        </div>
      </div>
    </div>
  );
}
