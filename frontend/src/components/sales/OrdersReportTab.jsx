import React from 'react';
import { Search, Download, Eye } from 'lucide-react';

export default function OrdersReportTab({
  orders = [],
  loading = false,
  searchTerm = '',
  onSearchChange,
  statusFilter = '',
  onStatusFilterChange,
  methodFilter = '',
  onMethodFilterChange,
  onExportCsv,
  onViewDetails,
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="sales-badge sales-badge-paid">Pago</span>;
      case 'pending':
        return <span className="sales-badge sales-badge-pending">Pendente</span>;
      case 'failed':
      case 'canceled':
        return <span className="sales-badge sales-badge-canceled">Cancelado</span>;
      case 'refunded':
        return <span className="sales-badge sales-badge-refunded">Reembolsado</span>;
      default:
        return <span className="sales-badge">{status}</span>;
    }
  };

  const formatMethod = (method) => {
    switch (method) {
      case 'pix':
        return 'Pix';
      case 'credit_card':
        return 'Cartão';
      case 'crypto':
        return 'Cripto';
      default:
        return method;
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
      <div className="sales-toolbar">
        <div className="sales-search-box">
          <Search size={16} className="sales-search-icon" />
          <input
            type="text"
            className="sales-search-input"
            placeholder="Buscar por código, cliente ou e-mail..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="orders-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="sales-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            data-testid="orders-status-filter"
          >
            <option value="">Todos os status</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
            <option value="canceled">Cancelados / Falhas</option>
            <option value="refunded">Reembolsados</option>
          </select>

          <select
            className="sales-filter-select"
            value={methodFilter}
            onChange={(e) => onMethodFilterChange(e.target.value)}
            data-testid="orders-method-filter"
          >
            <option value="">Todos os métodos</option>
            <option value="pix">Pix</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="crypto">Criptomoeda</option>
          </select>

          <button
            type="button"
            className="sales-btn-export"
            onClick={onExportCsv}
            data-testid="btn-export-orders-csv"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="sales-table-wrapper">
        <table className="sales-table" data-testid="orders-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Data/Hora</th>
              <th>Cliente</th>
              <th>Produto / Oferta</th>
              <th>Método</th>
              <th>Valor</th>
              <th>Status</th>
              <th>UTM Origem</th>
              <th style={{ textAlign: 'right' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="sales-empty">Carregando pedidos...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="9" className="sales-empty" data-testid="orders-empty-message">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} data-testid={`order-row-${o.id}`}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                      {o.order_code}
                    </strong>
                  </td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>
                    <div><strong>{o.customer_name}</strong></div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{o.customer_email}</div>
                  </td>
                  <td>
                    <div>{o.product_name || `Produto #${o.product_id}`}</div>
                    {o.offer_name && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{o.offer_name}</div>
                    )}
                  </td>
                  <td>{formatMethod(o.payment_method)}</td>
                  <td>
                    <strong>R$ {o.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </td>
                  <td>{getStatusBadge(o.status)}</td>
                  <td>
                    {o.utm_source ? (
                      <span className="sales-badge-utm">{o.utm_source}</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>direto</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="sales-btn-view"
                      title="Ver detalhes do pedido"
                      onClick={() => onViewDetails(o.id)}
                      data-testid={`view-order-btn-${o.id}`}
                    >
                      <Eye size={14} />
                    </button>
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
