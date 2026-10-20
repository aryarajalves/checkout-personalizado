import React, { useState } from 'react';
import { Copy, MessageCircle, Ban, ExternalLink, Check, Trash2, Pencil } from 'lucide-react';

export default function ProposalTable({ proposals, loading, onCancel, onDelete, onEdit }) {
  const [copiedCode, setCopiedCode] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getProposalUrl = (proposal) => {
    return `${window.location.origin}/pay/${proposal.product_slug}?proposal=${proposal.proposal_code}`;
  };

  const handleCopyLink = (proposal) => {
    const url = getProposalUrl(proposal);
    navigator.clipboard.writeText(url);
    setCopiedCode(proposal.proposal_code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleOpenWhatsApp = (proposal) => {
    const cleanPhone = (proposal.customer_phone || '').replace(/\D/g, '');
    const url = getProposalUrl(proposal);
    const text = encodeURIComponent(
      `Olá ${proposal.customer_name}! Conforme combinado, aqui está o link exclusivo para a sua vaga com a condição especial:\n\n🔗 ${url}\n\nQualquer dúvida estou à disposição!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="proposals-table-wrapper" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Carregando propostas de negociação...
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="proposals-table-wrapper" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Nenhuma proposta personalizada encontrada.</p>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>Clique em "Nova Proposta" para gerar um link de negociação individual.</p>
      </div>
    );
  }

  return (
    <div className="proposals-table-wrapper">
      <table className="proposals-table">
        <thead>
          <tr>
            <th>Proposta / Código</th>
            <th>Cliente</th>
            <th>Valor Negociado</th>
            <th>Forma & Parcelas</th>
            <th>Validade</th>
            <th>Closer</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((prop) => (
            <tr key={prop.id}>
              <td>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{prop.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#0284c7', fontFamily: 'monospace', marginTop: '2px' }}>
                  {prop.proposal_code}
                </div>
              </td>
              <td>
                <div style={{ fontWeight: 600 }}>{prop.customer_name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{prop.customer_email}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{prop.customer_phone}</div>
              </td>
              <td>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatBRL(prop.amount_brl)}</span>
              </td>
              <td>
                <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                  {prop.payment_method_allowed === 'all' && 'Todos os métodos'}
                  {prop.payment_method_allowed === 'pix' && 'Apenas Pix'}
                  {prop.payment_method_allowed === 'credit_card' && 'Apenas Cartão'}
                  {prop.payment_method_allowed === 'hybrid_pix_card' && 'Pix + Cartão'}
                  {prop.payment_method_allowed === 'hybrid_two_cards' && '2 Cartões'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Até {prop.max_installments}x
                </div>
              </td>
              <td>
                <div style={{ fontSize: '0.8rem', color: '#334155' }}>{formatDate(prop.expires_at)}</div>
                {prop.is_expired && prop.status === 'active' && (
                  <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>Expirada</span>
                )}
              </td>
              <td>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>{prop.closer_name || '-'}</span>
              </td>
              <td>
                <span className={`proposal-badge ${prop.status}`}>
                  {prop.status === 'active' && (prop.is_expired ? 'Expirada' : 'Ativa')}
                  {prop.status === 'paid' && 'Paga'}
                  {prop.status === 'expired' && 'Expirada'}
                  {prop.status === 'canceled' && 'Cancelada'}
                </span>
              </td>
              <td>
                <div className="proposal-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-icon-action"
                    title="Copiar Link do Checkout"
                    onClick={() => handleCopyLink(prop)}
                  >
                    {copiedCode === prop.proposal_code ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                  </button>

                  <button
                    type="button"
                    className="btn-icon-action whatsapp"
                    title="Enviar Proposta pelo WhatsApp"
                    onClick={() => handleOpenWhatsApp(prop)}
                  >
                    <MessageCircle size={16} />
                  </button>

                  <a
                    href={`/pay/${prop.product_slug}?proposal=${prop.proposal_code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon-action"
                    title="Abrir Checkout"
                  >
                    <ExternalLink size={16} />
                  </a>

                  {onEdit && prop.status !== 'paid' && (
                    <button
                      type="button"
                      className="btn-icon-action"
                      title="Editar Proposta"
                      onClick={() => onEdit(prop)}
                      data-testid={`btn-edit-proposal-${prop.id}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}

                  {prop.status === 'active' && !prop.is_expired && (
                    <button
                      type="button"
                      className="btn-icon-action cancel"
                      title="Cancelar Proposta"
                      onClick={() => setConfirmCancelId(prop.id)}
                    >
                      <Ban size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-icon-action cancel"
                    title="Excluir Proposta"
                    onClick={() => setConfirmDeleteId(prop.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Popup de Confirmação para Cancelar Proposta (regra experiencia-usuario.md) */}
      {confirmCancelId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.15rem' }}>Cancelar Proposta Comercial?</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.875rem' }}>
              O link exclusivo não poderá mais ser utilizado pelo cliente para finalizar a compra.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmCancelId(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancel(confirmCancelId);
                  setConfirmCancelId(null);
                }}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Sim, Cancelar Proposta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de Confirmação para Deletar Proposta */}
      {confirmDeleteId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.15rem' }}>Excluir Proposta Comercial?</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.875rem' }}>
              Essa ação removerá permanentemente o registro da proposta do sistema.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
              >
                Sim, Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
