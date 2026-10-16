import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  DollarSign,
  Filter,
  FileText,
} from 'lucide-react';

export default function AffiliateCommissionsTab({
  commissions = [],
  loading = false,
  statusFilter = 'all',
  onStatusFilterChange,
  onMarkPaid,
}) {
  const [commissionToPay, setCommissionToPay] = useState(null);
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const handleConfirmPay = async () => {
    if (!commissionToPay) return;
    try {
      setPayLoading(true);
      await onMarkPaid(commissionToPay.id, payNotes);
      setCommissionToPay(null);
      setPayNotes('');
    } finally {
      setPayLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="commissions-tab-container">
      {/* Barra de Filtros */}
      <div className="affiliates-actions-bar" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#94a3b8" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Filtrar status:</span>
          <select
            className="affiliate-form-select"
            style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="all">Todas as Comissões</option>
            <option value="pending">Pendentes</option>
            <option value="available">Disponíveis para Repasse</option>
            <option value="paid">Pagas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state-box">
          <Loader2 className="animate-spin" size={32} color="#38bdf8" />
          <span>Carregando extrato de comissões...</span>
        </div>
      ) : commissions.length === 0 ? (
        <div className="empty-state-box">
          <AlertCircle size={36} color="#64748b" />
          <p>Nenhuma comissão registrada com o filtro selecionado.</p>
        </div>
      ) : (
        <div className="commissions-table-container">
          <table className="commissions-table" data-testid="commissions-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Afiliado</th>
                <th>Pedido</th>
                <th>Produto</th>
                <th>Valor Venda</th>
                <th>Comissão</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((comm) => (
                <tr key={comm.id} data-testid={`commission-row-${comm.id}`}>
                  <td>{formatDate(comm.created_at)}</td>
                  <td>
                    <strong>{comm.affiliate_name || 'Afiliado'}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                      {comm.affiliate_code}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {comm.order_code || `#${comm.order_id}`}
                    </span>
                  </td>
                  <td>{comm.product_name || '—'}</td>
                  <td>R$ {Number(comm.sale_amount_brl || 0).toFixed(2)}</td>
                  <td>
                    <strong style={{ color: '#4ade80' }}>
                      R$ {Number(comm.amount_brl || 0).toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.3rem' }}>
                      ({comm.commission_percent}%)
                    </span>
                  </td>
                  <td>
                    <span className={`comm-status-badge comm-status-${comm.status}`}>
                      {comm.status === 'paid'
                        ? 'Pago'
                        : comm.status === 'available'
                        ? 'Disponível'
                        : 'Pendente'}
                    </span>
                  </td>
                  <td>
                    {comm.status !== 'paid' ? (
                      <button
                        type="button"
                        className="btn-icon-subtle"
                        style={{ color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.3)' }}
                        onClick={() => {
                          setCommissionToPay(comm);
                          setPayNotes('');
                        }}
                        data-testid={`btn-mark-paid-${comm.id}`}
                      >
                        <CheckCircle size={14} />
                        Marcar Pago
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Pago em {formatDate(comm.paid_at)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmação de Liquidação / Pagamento de Comissão */}
      {commissionToPay && (
        <div className="affiliate-modal-overlay" data-testid="mark-paid-modal">
          <div className="affiliate-modal-card" style={{ maxWidth: '440px' }}>
            <div className="affiliate-modal-header">
              <h3>Confirmar Pagamento de Comissão</h3>
            </div>
            <div className="affiliate-modal-body">
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem' }}>
                Você está confirmando o repasse de{' '}
                <strong style={{ color: '#4ade80' }}>
                  R$ {Number(commissionToPay.amount_brl || 0).toFixed(2)}
                </strong>{' '}
                para o parceiro <strong>{commissionToPay.affiliate_name}</strong> referente ao pedido{' '}
                <strong>{commissionToPay.order_code}</strong>.
              </p>

              <div className="affiliate-form-group" style={{ marginTop: '0.5rem' }}>
                <label>Comprovante / Notas de Repasse (opcional)</label>
                <input
                  type="text"
                  className="affiliate-form-input"
                  placeholder="Ex: Pix efetuado via Nubank comprovante #12345"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="affiliate-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCommissionToPay(null)}
                disabled={payLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-affiliate"
                onClick={handleConfirmPay}
                disabled={payLoading}
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                {payLoading ? 'Salvando...' : 'Confirmar como Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
