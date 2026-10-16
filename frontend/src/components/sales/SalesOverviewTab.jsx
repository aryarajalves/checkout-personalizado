import React from 'react';
import { TrendingUp, DollarSign, ShoppingBag, CheckCircle, Clock, CreditCard, QrCode } from 'lucide-react';

export default function SalesOverviewTab({ metrics = {}, loading = false }) {
  const formatBRL = (val) => {
    return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="sales-stats-grid" data-testid="sales-stats-grid">
        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span className="sales-stat-label">Faturamento Pago</span>
            <div className="sales-stat-icon sales-icon-revenue">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="sales-stat-value" data-testid="stat-total-revenue">
            R$ {formatBRL(metrics.total_revenue_brl)}
          </div>
          <span className="sales-stat-hint">{metrics.paid_orders_count || 0} vendas liquidadas</span>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span className="sales-stat-label">Ticket Médio</span>
            <div className="sales-stat-icon sales-icon-ticket">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="sales-stat-value" data-testid="stat-average-ticket">
            R$ {formatBRL(metrics.average_ticket_brl)}
          </div>
          <span className="sales-stat-hint">Média por pedido aprovado</span>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span className="sales-stat-label">Total de Pedidos</span>
            <div className="sales-stat-icon sales-icon-orders">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="sales-stat-value" data-testid="stat-total-orders">
            {metrics.total_orders_count || 0}
          </div>
          <span className="sales-stat-hint">Todos os status gerados</span>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span className="sales-stat-label">Taxa de Conversão</span>
            <div className="sales-stat-icon sales-icon-conversion">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="sales-stat-value" data-testid="stat-conversion-rate">
            {metrics.conversion_rate_percent || 0}%
          </div>
          <span className="sales-stat-hint">Aprovação sobre o total</span>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-top">
            <span className="sales-stat-label">Faturamento Pendente</span>
            <div className="sales-stat-icon sales-icon-pending">
              <Clock size={18} />
            </div>
          </div>
          <div className="sales-stat-value" data-testid="stat-pending-revenue">
            R$ {formatBRL(metrics.pending_revenue_brl)}
          </div>
          <span className="sales-stat-hint">{metrics.pending_orders_count || 0} aguardando pagamento</span>
        </div>
      </div>

      {/* Distribuição por Método de Pagamento */}
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
        Desempenho por Método de Pagamento
      </h3>

      <div className="sales-methods-grid" data-testid="sales-methods-grid">
        {(metrics.payment_methods_metrics || []).map((m) => (
          <div key={m.method} className="sales-method-card" data-testid={`method-card-${m.method}`}>
            <div className="sales-method-info">
              <span className="sales-method-title">{m.label}</span>
              <span className="sales-method-rev">R$ {formatBRL(m.revenue_brl)}</span>
              <span className="sales-method-pct">
                {m.paid_count} de {m.count} pedidos pagos ({m.percentage}% da receita)
              </span>
            </div>
            <div className="sales-stat-icon sales-icon-ticket">
              {m.method === 'pix' ? <QrCode size={18} /> : <CreditCard size={18} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
