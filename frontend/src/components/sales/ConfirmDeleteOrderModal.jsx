import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export default function ConfirmDeleteOrderModal({
  isOpen,
  order,
  selectedCount = 0,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const isBulk = selectedCount > 1 || (!order && selectedCount === 1);

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="confirm-delete-order-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="confirm-delete-order-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '90%' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
          <div className="webhooks-modal-title" style={{ gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={20} color="#dc2626" />
            </div>
            <div>
              <h3 style={{ color: '#991b1b', margin: 0, fontSize: '16px' }}>
                {isBulk ? 'Excluir Pedidos em Massa' : 'Excluir Pedido'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Ação destrutiva e permanente
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onCancel}
            disabled={loading}
            data-testid="btn-cancel-delete-x"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '20px' }}>
          <div
            style={{
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#991b1b' }}>
              {isBulk ? (
                <>
                  Você está prestes a excluir permanentemente{' '}
                  <strong>{selectedCount} pedidos selecionados</strong>.
                  <br />
                  Todos os registros vinculados de rateio e logs serão apagados.
                </>
              ) : (
                <>
                  Você está prestes a excluir permanentemente o pedido{' '}
                  <strong style={{ fontFamily: 'monospace' }}>{order?.order_code}</strong>
                  {order?.customer_name && (
                    <span>
                      {' '}
                      do cliente <strong>{order.customer_name}</strong>
                    </span>
                  )}
                  .
                </>
              )}
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
            Esta operação <strong>não pode ser desfeita</strong>. O pedido será removido do banco
            de dados e das métricas do relatório. Deseja continuar?
          </p>

          {/* Rodapé com botões de ação */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '24px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              data-testid="btn-cancel-delete-order"
              style={{
                padding: '9px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              data-testid="btn-confirm-delete-order"
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinning-icon" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 size={15} />
                  <span>{isBulk ? `Confirmar Exclusão (${selectedCount})` : 'Confirmar Exclusão'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
