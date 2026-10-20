import React from 'react';
import { RefreshCw, Send, X, Loader2, User, Mail, Package } from 'lucide-react';

export default function ConfirmResendWebhookModal({
  isOpen,
  cart,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen || !cart) return null;

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="confirm-resend-webhook-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="confirm-resend-webhook-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '490px',
          width: '90%',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Cabeçalho */}
        <div
          className="webhooks-modal-header"
          style={{
            borderBottom: '1px solid #e0f2fe',
            padding: '16px 20px',
            backgroundColor: '#f8fafc',
          }}
        >
          <div className="webhooks-modal-title" style={{ gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                flexShrink: 0,
              }}
            >
              <Send size={20} />
            </div>
            <div>
              <h3 style={{ color: '#0f172a', margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Reenviar Webhook de Abandono
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Disparo manual do evento <code>checkout.abandoned</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onCancel}
            disabled={loading}
            data-testid="btn-cancel-resend-x"
            style={{ color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '20px' }}>
          {/* Card com Detalhes do Lead */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0369a1' }}>
              <User size={15} style={{ flexShrink: 0, color: '#0284c7' }} />
              <span>
                Lead: <strong>{cart.customer_name || 'Desconhecido'}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0369a1' }}>
              <Mail size={15} style={{ flexShrink: 0, color: '#0284c7' }} />
              <span style={{ wordBreak: 'break-all' }}>
                E-mail: <strong>{cart.customer_email || '—'}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0369a1' }}>
              <Package size={15} style={{ flexShrink: 0, color: '#0284c7' }} />
              <span>
                Produto: <strong>{cart.product_name || 'Produto'}</strong>
                {cart.offer_name ? ` (${cart.offer_name})` : ''}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
            Esta ação reenviará a notificação oficial com todos os dados e links de recuperação deste lead para
            todas as URLs de webhook cadastradas no produto (n8n, ZapVoice, automações).
          </p>

          <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
            Deseja confirmar o reenvio imediato?
          </p>

          {/* Rodapé de Ações */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '22px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              data-testid="btn-cancel-resend-webhook"
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              data-testid="btn-confirm-resend-webhook"
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinning-icon" />
                  <span>Reenviando...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={15} />
                  <span>Confirmar Reenvio</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
