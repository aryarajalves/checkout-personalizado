import React, { useState } from 'react';

export default function BuyerSubscriptionsList({ subscriptions, onOpenCardModal }) {
  const [expandedSubId, setExpandedSubId] = useState(null);

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="buyer-empty-state">
        <div className="buyer-empty-icon">🔁</div>
        <h3 className="buyer-empty-title">Nenhuma Assinatura Ativa</h3>
        <p className="buyer-empty-desc">
          Você não possui planos ou assinaturas recorrentes vinculadas a este e-mail.
        </p>
      </div>
    );
  }

  const toggleInvoices = (subId) => {
    setExpandedSubId((prev) => (prev === subId ? null : subId));
  };

  const getCycleLabel = (cycle) => {
    switch (cycle) {
      case 'monthly':
        return 'Mensal';
      case 'quarterly':
        return 'Trimestral';
      case 'semiannual':
        return 'Semestral';
      case 'annual':
        return 'Anual';
      default:
        return cycle;
    }
  };

  const getSubStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="buyer-status-badge status-paid">● Ativa</span>;
      case 'past_due':
        return <span className="buyer-status-badge status-expired">● Em Atraso</span>;
      case 'paused':
        return <span className="buyer-status-badge status-pending">● Pausada</span>;
      case 'canceled':
        return <span className="buyer-status-badge status-canceled">● Cancelada</span>;
      default:
        return <span className="buyer-status-badge">{status}</span>;
    }
  };

  return (
    <div className="buyer-subs-grid">
      {subscriptions.map((sub) => {
        const formattedAmount = Number(sub.amount_brl || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        const nextBilling = sub.next_billing_at
          ? new Date(sub.next_billing_at).toLocaleDateString('pt-BR')
          : 'Não agendada';

        const isExpanded = expandedSubId === sub.id;

        return (
          <div key={sub.id} className="buyer-sub-card">
            <div className="buyer-sub-header">
              <div className="buyer-product-avatar-wrapper">
                {sub.product_image_url ? (
                  <img src={sub.product_image_url} alt={sub.product_name} className="buyer-product-avatar" />
                ) : (
                  <div className="buyer-product-placeholder">🔁</div>
                )}
              </div>

              <div className="buyer-sub-main-info">
                <span className="buyer-order-code">{sub.subscription_code}</span>
                <h3 className="buyer-order-title">{sub.product_name}</h3>
                <span className="buyer-cycle-badge">{getCycleLabel(sub.billing_cycle)}</span>
              </div>

              <div className="buyer-sub-status-col">
                {getSubStatusBadge(sub.status)}
              </div>
            </div>

            <div className="buyer-sub-details-bar">
              <div className="buyer-detail-item">
                <span className="buyer-detail-label">Valor Recorrente:</span>
                <strong className="buyer-detail-price">{formattedAmount}</strong>
              </div>
              <div className="buyer-detail-item">
                <span className="buyer-detail-label">Próxima Cobrança:</span>
                <span className="buyer-detail-value">{nextBilling}</span>
              </div>
              <div className="buyer-detail-item">
                <span className="buyer-detail-label">Cartão Atual:</span>
                <span className="buyer-detail-card">
                  {sub.card_last_four ? `•••• ${sub.card_last_four} (${(sub.card_brand || 'cartão').toUpperCase()})` : 'Não vinculado'}
                </span>
              </div>
            </div>

            <div className="buyer-sub-actions-bar">
              <button
                type="button"
                className="buyer-btn-action btn-card"
                onClick={() => onOpenCardModal(sub)}
              >
                <span>💳 Atualizar Cartão de Crédito</span>
              </button>

              {sub.status === 'active' && sub.member_area_url && (
                <a
                  href={sub.member_area_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buyer-btn-action btn-access"
                >
                  <span>🎓 Acessar Área de Membros</span>
                </a>
              )}

              {sub.invoices && sub.invoices.length > 0 && (
                <button
                  type="button"
                  className="buyer-btn-link"
                  onClick={() => toggleInvoices(sub.id)}
                >
                  {isExpanded ? 'Ocultar Histórico de Faturas ▲' : `Ver Faturas (${sub.invoices.length}) ▼`}
                </button>
              )}
            </div>

            {isExpanded && sub.invoices && (
              <div className="buyer-invoices-accordion">
                <h4 className="buyer-invoices-title">Histórico de Faturas</h4>
                <div className="buyer-invoices-list">
                  {sub.invoices.map((inv) => {
                    const invDate = inv.paid_at || inv.due_date;
                    const dateStr = invDate ? new Date(invDate).toLocaleDateString('pt-BR') : '';
                    return (
                      <div key={inv.id} className="buyer-invoice-item">
                        <div className="buyer-invoice-code">
                          <span>Ciclo {inv.cycle_number}</span>
                          <span className="invoice-hash">{inv.invoice_code}</span>
                        </div>
                        <div className="buyer-invoice-amount">
                          {Number(inv.amount_brl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="buyer-invoice-status">
                          <span className={`invoice-tag tag-${inv.status}`}>{inv.status === 'paid' ? 'Paga' : inv.status}</span>
                          <span className="invoice-date">{dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
