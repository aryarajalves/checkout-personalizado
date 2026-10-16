import React from 'react';
import { ShoppingCart, CheckCircle2, QrCode, DollarSign } from 'lucide-react';

export default function RecoveryStatsCards({ stats = {} }) {
  const {
    total_abandoned = 0,
    total_recovered = 0,
    total_converted = 0,
    abandoned_rate = 0,
    total_abandoned_amount_brl = 0,
    total_recovered_amount_brl = 0,
    total_pix_generated = 0,
    total_pix_pending = 0,
    total_pix_paid = 0,
    pix_conversion_rate = 0,
    total_pix_pending_amount_brl = 0,
  } = stats;

  return (
    <div className="recovery-stats-grid" data-testid="recovery-stats-cards">
      {/* Card 1: Carrinhos Abandonados */}
      <div className="recovery-stat-card">
        <div className="recovery-stat-header">
          <span className="recovery-stat-label">Carrinhos Abandonados</span>
          <div className="recovery-stat-icon-wrapper orange">
            <ShoppingCart size={20} />
          </div>
        </div>
        <div className="recovery-stat-value">{total_abandoned}</div>
        <div className="recovery-stat-subtext">
          Valor em risco: <strong>R$ {total_abandoned_amount_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {/* Card 2: Carrinhos Recuperados */}
      <div className="recovery-stat-card">
        <div className="recovery-stat-header">
          <span className="recovery-stat-label">Carrinhos Recuperados</span>
          <div className="recovery-stat-icon-wrapper green">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="recovery-stat-value">{total_recovered + total_converted}</div>
        <div className="recovery-stat-subtext">
          Taxa de recuperação: <span className="stat-badge success">{abandoned_rate}%</span> (R$ {total_recovered_amount_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
        </div>
      </div>

      {/* Card 3: Pix Gerados vs Pagos */}
      <div className="recovery-stat-card">
        <div className="recovery-stat-header">
          <span className="recovery-stat-label">Pix Gerados</span>
          <div className="recovery-stat-icon-wrapper cyan">
            <QrCode size={20} />
          </div>
        </div>
        <div className="recovery-stat-value">{total_pix_generated}</div>
        <div className="recovery-stat-subtext">
          Convertidos: <strong>{total_pix_paid}</strong> (<span className="stat-badge info">{pix_conversion_rate}%</span>)
        </div>
      </div>

      {/* Card 4: Pix Pendentes */}
      <div className="recovery-stat-card">
        <div className="recovery-stat-header">
          <span className="recovery-stat-label">Pix Aguardando Pagamento</span>
          <div className="recovery-stat-icon-wrapper yellow">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="recovery-stat-value">{total_pix_pending}</div>
        <div className="recovery-stat-subtext">
          Valor pendente: <strong className="text-warning">R$ {total_pix_pending_amount_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>
    </div>
  );
}
