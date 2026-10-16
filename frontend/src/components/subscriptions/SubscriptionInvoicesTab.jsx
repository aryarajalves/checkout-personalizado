import React from 'react';

export default function SubscriptionInvoicesTab({
  invoices = [],
  loading = false,
  statusFilter = '',
  onStatusFilterChange,
}) {
  const getInvoiceBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="subs-badge subs-badge-paid">Paga</span>;
      case 'pending':
        return <span className="subs-badge subs-badge-past_due">Pendente</span>;
      case 'failed':
        return <span className="subs-badge subs-badge-canceled">Falhou</span>;
      case 'canceled':
        return <span className="subs-badge subs-badge-paused">Cancelada</span>;
      default:
        return <span className="subs-badge">{status}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="subs-toolbar">
        <div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
            Histórico Consolidado de Faturas e Ciclos
          </span>
        </div>

        <select
          className="subs-filter-select"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          data-testid="invoices-status-filter"
        >
          <option value="">Todas as faturas</option>
          <option value="paid">Pagas</option>
          <option value="pending">Pendentes</option>
          <option value="failed">Falhas de cobrança</option>
          <option value="canceled">Canceladas</option>
        </select>
      </div>

      {/* Tabela de Faturas */}
      <div className="subs-table-wrapper">
        <table className="subs-table" data-testid="invoices-table">
          <thead>
            <tr>
              <th>Código Fatura</th>
              <th>Assinatura ID</th>
              <th>Ciclo nº</th>
              <th>Valor (R$)</th>
              <th>Status</th>
              <th>Data Emissão / Vencimento</th>
              <th>Pago em</th>
              <th>Gateway Charge ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="subs-empty">Carregando faturas...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="subs-empty" data-testid="invoices-empty-message">
                  Nenhuma fatura encontrada.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} data-testid={`invoice-row-${inv.id}`}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                      {inv.invoice_code}
                    </strong>
                  </td>
                  <td>#{inv.subscription_id}</td>
                  <td>
                    <span className="subs-badge-cycle">Ciclo {inv.cycle_number}</span>
                  </td>
                  <td>
                    <strong>R$ {inv.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </td>
                  <td>{getInvoiceBadge(inv.status)}</td>
                  <td>{formatDate(inv.due_date || inv.created_at)}</td>
                  <td>{formatDate(inv.paid_at)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                    {inv.gateway_charge_id || '—'}
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
