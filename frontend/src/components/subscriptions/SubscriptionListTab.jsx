import React from 'react';
import { Search, Eye, PauseCircle, PlayCircle, XCircle } from 'lucide-react';

export default function SubscriptionListTab({
  subscriptions = [],
  loading = false,
  searchTerm = '',
  onSearchChange,
  statusFilter = '',
  onStatusFilterChange,
  onViewDetails,
  onTogglePause,
  onOpenCancel,
}) {
  const getCycleLabel = (cycle) => {
    switch (cycle) {
      case 'quarterly':
        return 'Trimestral';
      case 'semiannual':
        return 'Semestral';
      case 'annual':
        return 'Anual';
      case 'monthly':
      default:
        return 'Mensal';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="subs-badge subs-badge-active">Ativa</span>;
      case 'past_due':
        return <span className="subs-badge subs-badge-past_due">Em Atraso</span>;
      case 'paused':
        return <span className="subs-badge subs-badge-paused">Pausada</span>;
      case 'canceled':
        return <span className="subs-badge subs-badge-canceled">Cancelada</span>;
      default:
        return <span className="subs-badge">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const calculateMrr = (amount, cycle) => {
    if (!amount) return '0,00';
    let div = 1;
    if (cycle === 'quarterly') div = 3;
    if (cycle === 'semiannual') div = 6;
    if (cycle === 'annual') div = 12;
    return (amount / div).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="subs-toolbar">
        <div className="subs-search-box">
          <Search size={16} className="subs-search-icon" />
          <input
            type="text"
            className="subs-search-input"
            placeholder="Buscar por cliente, e-mail ou código..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="subs-search-input"
          />
        </div>

        <select
          className="subs-filter-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          data-testid="subs-status-filter"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="past_due">Em Atraso</option>
          <option value="paused">Pausadas</option>
          <option value="canceled">Canceladas</option>
        </select>
      </div>

      {/* Tabela de Assinaturas */}
      <div className="subs-table-wrapper">
        <table className="subs-table" data-testid="subs-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Produto / Oferta</th>
              <th>Ciclo</th>
              <th>Valor</th>
              <th>MRR Est.</th>
              <th>Status</th>
              <th>Próx. Cobrança</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="subs-empty">Carregando assinaturas...</td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan="9" className="subs-empty" data-testid="subs-empty-message">
                  Nenhuma assinatura encontrada.
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} data-testid={`sub-row-${sub.id}`}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                      {sub.subscription_code}
                    </strong>
                  </td>
                  <td>
                    <div>
                      <strong>{sub.customer_name}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {sub.customer_email}
                    </div>
                  </td>
                  <td>
                    <div>{sub.product_name || `Produto #${sub.product_id}`}</div>
                    {sub.offer_name && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{sub.offer_name}</div>
                    )}
                  </td>
                  <td>
                    <span className="subs-badge-cycle">{getCycleLabel(sub.billing_cycle)}</span>
                  </td>
                  <td>
                    <strong>R$ {sub.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </td>
                  <td style={{ color: '#059669', fontWeight: 600 }}>
                    R$ {calculateMrr(sub.amount_brl, sub.billing_cycle)}
                  </td>
                  <td>{getStatusBadge(sub.status)}</td>
                  <td>{formatDate(sub.next_billing_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="subs-btn-action"
                        title="Ver faturas e detalhes"
                        onClick={() => onViewDetails(sub)}
                        data-testid={`sub-details-btn-${sub.id}`}
                      >
                        <Eye size={14} />
                      </button>

                      {sub.status === 'active' && (
                        <button
                          type="button"
                          className="subs-btn-action"
                          title="Pausar assinatura"
                          onClick={() => onTogglePause(sub)}
                          data-testid={`sub-pause-btn-${sub.id}`}
                        >
                          <PauseCircle size={14} />
                        </button>
                      )}

                      {sub.status === 'paused' && (
                        <button
                          type="button"
                          className="subs-btn-action"
                          title="Reativar assinatura"
                          onClick={() => onTogglePause(sub)}
                          data-testid={`sub-resume-btn-${sub.id}`}
                        >
                          <PlayCircle size={14} />
                        </button>
                      )}

                      {sub.status !== 'canceled' && (
                        <button
                          type="button"
                          className="subs-btn-action danger"
                          title="Cancelar assinatura"
                          onClick={() => onOpenCancel(sub)}
                          data-testid={`sub-cancel-btn-${sub.id}`}
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
