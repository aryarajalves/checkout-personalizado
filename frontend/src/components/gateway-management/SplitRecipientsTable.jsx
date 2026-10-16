import React from 'react';
import { UserPlus, Edit2, Trash2, CheckCircle2, XCircle, Wallet, QrCode, AlertCircle } from 'lucide-react';

export default function SplitRecipientsTable({
  recipients,
  loading,
  onOpenCreate,
  onOpenEdit,
  onPromptDelete,
}) {
  const activeRecipients = (recipients || []).filter((r) => r.is_active);
  const totalPercentage = activeRecipients.reduce((sum, r) => sum + (r.default_percentage || 0), 0);

  return (
    <div className="split-recipients-section glass-panel" data-testid="split-recipients-container">
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Recebedores do Split de Pagamento
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Cadastre os participantes, contas Pix e carteiras cripto para repasse automático das vendas.
          </p>
        </div>

        <button
          type="button"
          className="primary-action-btn"
          onClick={onOpenCreate}
          data-testid="add-recipient-btn"
        >
          <UserPlus size={16} />
          <span>Novo Recebedor</span>
        </button>
      </div>

      {/* Resumo de Porcentagem Total */}
      <div
        className={`split-summary-bar ${totalPercentage > 100 ? 'split-warning' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: totalPercentage > 100 ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${totalPercentage > 100 ? '#fecaca' : '#bbf7d0'}`,
          marginBottom: '16px',
          fontSize: '13.5px',
          color: totalPercentage > 100 ? '#b91c1c' : '#15803d',
        }}
      >
        {totalPercentage > 100 ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
        <span>
          <strong>Total de Split Padrão Ativo: {totalPercentage.toFixed(1)}%</strong>
          {totalPercentage > 100
            ? ' — Atenção: A soma das porcentagens ultrapassa 100%!'
            : ` (Restante para o titular principal: ${(100 - totalPercentage).toFixed(1)}%)`}
        </span>
      </div>

      {/* Tabela de Recebedores */}
      {(!recipients || recipients.length === 0) ? (
        <div className="empty-table-state" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ margin: 0 }}>Nenhum recebedor cadastrado ainda.</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>
            Clique no botão acima para adicionar sócios, parceiros ou afiliados para divisão automática.
          </p>
        </div>
      ) : (
        <div className="table-responsive-container">
          <table className="custom-data-table" data-testid="recipients-table">
            <thead>
              <tr>
                <th>Nome / Documento</th>
                <th>Chave Pix</th>
                <th>Carteira Cripto (Web3)</th>
                <th>% Split</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((rec) => (
                <tr key={rec.id} data-testid={`recipient-row-${rec.id}`}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{rec.name}</div>
                    {rec.document && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Doc: {rec.document}</div>
                    )}
                    {rec.email && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{rec.email}</div>
                    )}
                  </td>
                  <td>
                    {rec.pix_key ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <QrCode size={14} color="#0284c7" />
                        <span style={{ fontSize: '13px' }}>{rec.pix_key}</span>
                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                          ({rec.pix_key_type})
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td>
                    {rec.crypto_wallet ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Wallet size={14} color="#8b5cf6" />
                          <span style={{ fontSize: '12.5px', fontFamily: 'monospace' }}>
                            {rec.crypto_wallet.length > 14
                              ? `${rec.crypto_wallet.slice(0, 6)}...${rec.crypto_wallet.slice(-4)}`
                              : rec.crypto_wallet}
                          </span>
                        </div>
                        <span className="network-badge" style={{ fontSize: '10.5px', textTransform: 'uppercase' }}>
                          {rec.crypto_network || 'Polygon'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                      {rec.default_percentage}%
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${rec.is_active ? 'active' : 'inactive'}`}>
                      {rec.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="table-action-icon-btn"
                        onClick={() => onOpenEdit(rec)}
                        title="Editar Recebedor"
                        data-testid={`edit-recipient-${rec.id}`}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="table-action-icon-btn danger"
                        onClick={() => onPromptDelete(rec)}
                        title="Excluir Recebedor"
                        data-testid={`delete-recipient-${rec.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
