import React from 'react';
import { Trash2 } from 'lucide-react';

export default function ConfirmDeleteRecipientModal({
  isOpen,
  title,
  message,
  loading,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      data-testid="confirm-delete-recipient-overlay"
      onClick={(e) => {
        // Regra: NÃO fechar ao clicar fora do painel central
        e.stopPropagation();
      }}
    >
      <div
        className="modal-content confirm-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-recipient-title"
        data-testid="confirm-delete-recipient-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-delete-icon-wrapper">
          <Trash2 size={32} />
        </div>

        <h3 id="confirm-delete-recipient-title" className="confirm-delete-title" data-testid="confirm-delete-title">
          {title || 'Excluir Recebedor'}
        </h3>

        <p className="confirm-delete-message" data-testid="confirm-delete-message">
          {message || 'Tem certeza que deseja remover este recebedor do split de pagamentos?'}
        </p>

        <div className="confirm-delete-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-delete-recipient-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="confirm-danger-btn"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-delete-recipient-btn"
          >
            {loading ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
