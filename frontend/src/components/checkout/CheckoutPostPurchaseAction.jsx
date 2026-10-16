import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';

export default function CheckoutPostPurchaseAction({
  createdOrder,
  hasActiveUpsell,
  postPurchaseTargetUrl,
  redirectCountdown,
  testId,
}) {
  return (
    <div style={{ marginTop: '16px', textAlign: 'center' }}>
      {createdOrder?.status === 'paid' && (
        <div
          data-testid="auto-redirect-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#0284c7',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '4px 14px',
            borderRadius: '20px',
            fontWeight: 600,
            marginBottom: '10px',
          }}
        >
          <Clock size={14} color="#0284c7" />
          <span>
            Redirecionando em <strong>{redirectCountdown}</strong> segundo{redirectCountdown !== 1 ? 's' : ''}...
          </span>
        </div>
      )}
      <div>
        <a
          href={postPurchaseTargetUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: hasActiveUpsell
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: hasActiveUpsell
              ? '0 4px 14px rgba(245, 158, 11, 0.3)'
              : '0 4px 14px rgba(16, 185, 129, 0.3)',
          }}
          data-testid={testId}
        >
          <span>{hasActiveUpsell ? 'Avançar para Oferta Exclusiva de UpSell' : 'Acessar Página de Obrigado'}</span>
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}
