import React from 'react';
import { X, RotateCcw, AlertCircle } from 'lucide-react';

export default function OrderDetailsModal({
  order,
  onClose,
  onOpenRefund,
}) {
  if (!order) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const isPaid = order.status === 'paid';
  const isRefunded = order.status === 'refunded';

  return (
    <div className="sales-modal-backdrop" data-testid="order-details-modal">
      <div className="sales-modal-panel">
        <div className="sales-modal-header">
          <h2 className="sales-modal-title">Pedido {order.order_code}</h2>
          <button
            type="button"
            className="sales-modal-close-btn"
            onClick={onClose}
            data-testid="close-order-details-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sales-modal-body">
          {/* Alerta de Reembolso se o pedido foi estornado */}
          {isRefunded && (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
              data-testid="refund-details-banner"
            >
              <AlertCircle size={20} style={{ color: '#e11d48', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#9f1239', fontSize: '14px', display: 'block' }}>
                  Pedido Reembolsado {order.refunded_at ? `em ${formatDate(order.refunded_at)}` : ''}
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#be123c' }}>
                  <strong>Motivo:</strong> {order.refund_reason || 'Motivo não registrado.'}
                </p>
              </div>
            </div>
          )}

          {/* Detalhes Gerais */}
          <div className="sales-detail-grid">
            <div className="sales-detail-item">
              <span className="sales-detail-label">Cliente</span>
              <span className="sales-detail-val">{order.customer_name}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {order.customer_email} • +{order.customer_phone_ddi || '55'} {order.customer_phone}
              </span>
            </div>

            <div className="sales-detail-item">
              <span className="sales-detail-label">Status & Método</span>
              <span className="sales-detail-val" style={{ textTransform: 'capitalize' }}>
                {order.status} ({order.payment_method})
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Gateway: {order.gateway_name}
              </span>
            </div>

            <div className="sales-detail-item">
              <span className="sales-detail-label">Produto & Oferta</span>
              <span className="sales-detail-val">{order.product_name}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {order.offer_name || 'Oferta Padrão'}
              </span>
            </div>

            <div className="sales-detail-item">
              <span className="sales-detail-label">Valor Total</span>
              <span className="sales-detail-val" style={{ color: isRefunded ? '#dc2626' : '#059669', fontSize: '16px' }}>
                R$ {order.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {order.discount_amount_brl > 0 && (
                <span style={{ fontSize: '12px', color: '#dc2626' }}>
                  Desconto cupom ({order.coupon_code}): - R$ {order.discount_amount_brl?.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Rastreamento de Tráfego / UTMs */}
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
            Origem do Tráfego & UTMs
          </h3>
          <div className="sales-detail-grid" style={{ marginBottom: '20px' }}>
            <div className="sales-detail-item">
              <span className="sales-detail-label">UTM Source</span>
              <span className="sales-detail-val">{order.utm_source || '— (direto)'}</span>
            </div>
            <div className="sales-detail-item">
              <span className="sales-detail-label">UTM Campaign</span>
              <span className="sales-detail-val">{order.utm_campaign || '—'}</span>
            </div>
            <div className="sales-detail-item">
              <span className="sales-detail-label">UTM Medium</span>
              <span className="sales-detail-val">{order.utm_medium || '—'}</span>
            </div>
            <div className="sales-detail-item">
              <span className="sales-detail-label">Parâmetro SRC</span>
              <span className="sales-detail-val">{order.src || '—'}</span>
            </div>
          </div>

          {/* Divisão de Pagamento / Splits */}
          {order.splits && order.splits.length > 0 && (
            <>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                Split de Pagamento Entre Sócios
              </h3>
              <div className="sales-table-wrapper" style={{ marginBottom: '0' }}>
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>Sócio / Recebedor</th>
                      <th>Percentual</th>
                      <th>Valor Repassado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.splits.map((s, idx) => (
                      <tr key={idx}>
                        <td><strong>{s.recipient_name}</strong></td>
                        <td>{s.percentage}%</td>
                        <td>R$ {s.amount_brl?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="sales-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isPaid && onOpenRefund && (
              <button
                type="button"
                className="sales-btn-export"
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecdd3',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  borderRadius: '6px',
                }}
                onClick={() => onOpenRefund(order)}
                data-testid="open-refund-from-details-btn"
              >
                <RotateCcw size={15} />
                <span>Estornar Pedido</span>
              </button>
            )}
          </div>
          <button
            type="button"
            className="sales-btn-close"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
