import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { refundOrderApi } from './salesApi';
import { useToast } from '../../context/ToastContext';

export const REFUND_REASONS = [
  'Arrependimento de compra / Prazo de 7 dias',
  'Insatisfação com o conteúdo / produto',
  'Problemas técnicos ou de acesso',
  'Compra em duplicidade / engano do cliente',
  'Acordo comercial direto com o cliente',
  'Outro motivo (especificar)',
];

export default function RefundModal({
  isOpen,
  order,
  onClose,
  onRefundSuccess,
}) {
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { addToast } = useToast();

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason === 'Outro motivo (especificar)' && !notes.trim()) {
      setErrorMsg('Por favor, especifique o motivo no campo de observações.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await refundOrderApi(order.id, {
        reason,
        notes: notes.trim(),
      });
      addToast(response.message || 'Pedido estornado com sucesso!', 'success');
      if (onRefundSuccess) {
        onRefundSuccess({
          ...order,
          status: 'refunded',
          refund_reason: response.refund_reason,
          refunded_at: response.refunded_at,
        });
      }
      onClose();
    } catch (err) {
      const msg = err.message || 'Erro ao processar o estorno do pedido.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="sales-modal-backdrop"
      data-testid="refund-order-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-modal-title"
    >
      <div className="sales-modal-panel" style={{ maxWidth: '520px' }}>
        <div className="sales-modal-header" style={{ borderBottom: '1px solid #fee2e2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <RotateCcw size={18} />
            </div>
            <h2 id="refund-modal-title" className="sales-modal-title" style={{ color: '#991b1b' }}>
              Estornar Pedido {order.order_code}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sales-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Resumo da Transação */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Cliente:</span>
                <strong style={{ color: '#0f172a' }}>{order.customer_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Método de Pagamento:</span>
                <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                  {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : order.payment_method}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Valor a Estornar:</span>
                <strong style={{ color: '#dc2626', fontSize: '16px' }}>
                  R$ {order.amount_brl?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Seleção do Motivo */}
            <div>
              <label
                htmlFor="refund-reason-select"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
              >
                Motivo do Reembolso <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                id="refund-reason-select"
                className="sales-filter-select"
                style={{ width: '100%', height: '40px' }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="refund-reason-select"
                disabled={isSubmitting}
              >
                {REFUND_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Observações Adicionais */}
            <div>
              <label
                htmlFor="refund-notes-input"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
              >
                Observações / Detalhes do Estorno
                {reason === 'Outro motivo (especificar)' && <span style={{ color: '#dc2626' }}> *</span>}
              </label>
              <textarea
                id="refund-notes-input"
                className="sales-search-input"
                style={{ width: '100%', minHeight: '80px', padding: '10px', resize: 'vertical' }}
                placeholder="Informe detalhes adicionais sobre a solicitação do cliente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="refund-notes-input"
                disabled={isSubmitting}
              />
            </div>

            {/* Aviso de Confirmação */}
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}>
              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.4' }}>
                <strong>Atenção:</strong> Esta ação é irreversível. O estorno será enviado ao gateway de pagamento (Pagar.me) e os valores de split entre sócios/afiliados serão estornados proporcionalmente.
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 500 }} data-testid="refund-error-message">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="sales-modal-footer" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="sales-btn-close"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="cancel-refund-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="sales-btn-export"
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              disabled={isSubmitting}
              data-testid="confirm-refund-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Estornando...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  <span>Confirmar Estorno</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
