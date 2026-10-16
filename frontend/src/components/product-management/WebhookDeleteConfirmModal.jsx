import React from 'react';
import { Trash2 } from 'lucide-react';

export function WebhookDeleteConfirmModal({
  isOpen,
  webhook,
  loading,
  onConfirm,
  onClose,
}) {
  if (!isOpen || !webhook) return null;

  return (
    <div
      className="webhooks-confirm-overlay"
      data-testid="webhook-delete-modal-overlay"
      onClick={(e) => {
        // Regra do projeto: NÃO deve fechar ao clicar fora do painel central
        e.stopPropagation();
      }}
    >
      <div
        className="webhooks-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        data-testid="webhook-delete-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="webhooks-confirm-icon-box">
          <Trash2 size={28} />
        </div>

        <h3 id="confirm-delete-title" className="webhooks-confirm-title">
          Excluir Webhook?
        </h3>

        <p className="webhooks-confirm-message">
          Tem certeza que deseja remover o webhook{' '}
          {webhook.name && <strong>"{webhook.name}"</strong>}?
          <span className="webhooks-confirm-url">{webhook.url}</span>
        </p>

        <p className="webhooks-confirm-subtext">
          Esta ação é irreversível. O endpoint deixará de receber notificações deste produto imediatamente.
        </p>

        <div className="webhooks-confirm-actions">
          <button
            type="button"
            className="webhooks-btn-secondary"
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-delete-webhook-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="webhooks-confirm-danger-btn"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-delete-webhook-btn"
          >
            {loading ? 'Excluindo...' : 'Sim, Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
