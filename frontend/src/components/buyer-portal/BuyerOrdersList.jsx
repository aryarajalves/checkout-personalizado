import React from 'react';

export default function BuyerOrdersList({ orders, onOpenPix, onRegeneratePix, actionLoading }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="buyer-empty-state">
        <div className="buyer-empty-icon">📦</div>
        <h3 className="buyer-empty-title">Nenhum Pedido Encontrado</h3>
        <p className="buyer-empty-desc">
          Você não possui nenhum pedido registrado para este e-mail. Se comprou com outro e-mail, encerre a sessão e tente novamente.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status, isPixExpired) => {
    switch (status) {
      case 'paid':
        return <span className="buyer-status-badge status-paid">● Aprovado</span>;
      case 'pending':
        return isPixExpired ? (
          <span className="buyer-status-badge status-expired">● Pix Expirado</span>
        ) : (
          <span className="buyer-status-badge status-pending">● Aguardando Pagamento</span>
        );
      case 'refunded':
        return <span className="buyer-status-badge status-refunded">● Reembolsado</span>;
      case 'canceled':
      case 'failed':
        return <span className="buyer-status-badge status-canceled">● Cancelado</span>;
      default:
        return <span className="buyer-status-badge">{status}</span>;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'pix':
        return 'Pix';
      case 'credit_card':
        return 'Cartão de Crédito';
      case 'crypto':
        return 'Criptomoeda';
      case 'hybrid_pix_card':
        return 'Pix + Cartão';
      case 'two_cards':
        return '2 Cartões';
      default:
        return method;
    }
  };

  return (
    <div className="buyer-orders-grid">
      {orders.map((order) => {
        const formattedPrice = Number(order.amount_brl || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const dateStr = order.created_at
          ? new Date(order.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        return (
          <div key={order.id} className="buyer-order-card">
            <div className="buyer-order-header">
              <div className="buyer-product-avatar-wrapper">
                {order.product_image_url ? (
                  <img src={order.product_image_url} alt={order.product_name} className="buyer-product-avatar" />
                ) : (
                  <div className="buyer-product-placeholder">🎓</div>
                )}
              </div>

              <div className="buyer-order-main-info">
                <span className="buyer-order-code">{order.order_code}</span>
                <h3 className="buyer-order-title">{order.product_name}</h3>
                {order.offer_name && <span className="buyer-offer-badge">{order.offer_name}</span>}
              </div>

              <div className="buyer-order-status-col">
                {getStatusBadge(order.status, order.is_pix_expired)}
                <span className="buyer-order-date">{dateStr}</span>
              </div>
            </div>

            <div className="buyer-order-details-bar">
              <div className="buyer-detail-item">
                <span className="buyer-detail-label">Método:</span>
                <span className="buyer-detail-value">{getPaymentMethodLabel(order.payment_method)}</span>
              </div>
              <div className="buyer-detail-item">
                <span className="buyer-detail-label">Valor:</span>
                <strong className="buyer-detail-price">{formattedPrice}</strong>
              </div>
            </div>

            <div className="buyer-order-actions-bar">
              {order.status === 'paid' && order.member_area_url && (
                <a
                  href={order.member_area_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buyer-btn-action btn-access"
                >
                  <span>🎓 Acessar Área de Membros</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}

              {order.status === 'pending' && order.payment_method === 'pix' && (
                <>
                  {order.is_pix_expired ? (
                    <button
                      type="button"
                      className="buyer-btn-action btn-pix"
                      onClick={() => onRegeneratePix(order.order_code)}
                      disabled={actionLoading}
                    >
                      <span>⚡ Gerar Novo Pix</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="buyer-btn-action btn-pix"
                      onClick={() => onOpenPix(order)}
                    >
                      <span>⚡ Pagar com Pix (QR Code)</span>
                    </button>
                  )}
                </>
              )}

              {order.thank_you_url && (
                <a
                  href={order.thank_you_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buyer-btn-action btn-receipt"
                >
                  <span>Ver Recibo</span>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
