import React from 'react';
import { Trash2 } from 'lucide-react';

export function ConfirmDeleteBumpModal({
  isOpen,
  bump,
  onClose,
  onConfirm,
  loading = false,
}) {
  if (!isOpen || !bump) return null;

  return (
    <div
      className="webhooks-confirm-overlay"
      data-testid="delete-bump-confirm-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-confirm-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="delete-bump-confirm-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="webhooks-confirm-icon-box delete">
          <Trash2 size={24} />
        </div>
        <h3 className="webhooks-confirm-title">Excluir Order Bump?</h3>
        <p className="webhooks-confirm-message">
          Deseja realmente remover o bump <strong>"{bump.title}"</strong>?
        </p>
        <div className="webhooks-confirm-actions">
          <button
            type="button"
            className="webhooks-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="webhooks-confirm-primary-btn"
            style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-delete-bump-btn"
          >
            <span>{loading ? 'Excluindo...' : 'Sim, Excluir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteBumpModal;
