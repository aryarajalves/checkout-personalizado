import React from 'react';
import { DollarSign, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

export default function ProposalMetrics({ metrics, loading }) {
  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  return (
    <div className="proposal-metrics-grid">
      <div className="proposal-metric-card">
        <div className="proposal-metric-icon blue">
          <Sparkles size={24} />
        </div>
        <div className="proposal-metric-info">
          <h3>Total de Propostas</h3>
          <p className="proposal-metric-value">
            {loading ? '...' : (metrics.total_proposals || 0)}
          </p>
        </div>
      </div>

      <div className="proposal-metric-card">
        <div className="proposal-metric-icon green">
          <CheckCircle2 size={24} />
        </div>
        <div className="proposal-metric-info">
          <h3>Propostas Fechadas</h3>
          <p className="proposal-metric-value">
            {loading ? '...' : (metrics.paid_proposals || 0)}
          </p>
        </div>
      </div>

      <div className="proposal-metric-card">
        <div className="proposal-metric-icon purple">
          <DollarSign size={24} />
        </div>
        <div className="proposal-metric-info">
          <h3>Faturamento Fechado</h3>
          <p className="proposal-metric-value">
            {loading ? '...' : formatBRL(metrics.total_amount_paid)}
          </p>
        </div>
      </div>

      <div className="proposal-metric-card">
        <div className="proposal-metric-icon amber">
          <TrendingUp size={24} />
        </div>
        <div className="proposal-metric-info">
          <h3>Taxa de Fechamento</h3>
          <p className="proposal-metric-value">
            {loading ? '...' : `${metrics.conversion_rate || 0}%`}
          </p>
        </div>
      </div>
    </div>
  );
}
