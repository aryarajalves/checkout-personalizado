import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AVAILABLE_EVENTS } from './WebhooksConfigTab';

export function WebhookRetryConfirmModal({
  isOpen,
  log,
  loading,
  onConfirm,
  onClose,
}) {
  if (!isOpen || !log) return null;

  const evtMeta = AVAILABLE_EVENTS.find((e) => e.id === log.event || e.label === log.event);
  const eventLabel = evtMeta ? evtMeta.label : log.event;

  return (
    <div
      className="webhooks-confirm-overlay"
      data-testid="webhook-retry-modal-overlay"
      onClick={(e) => {
        // Regra do projeto: NÃO deve fechar ao clicar fora do painel central
        e.stopPropagation();
      }}
    >
      <div
        className="webhooks-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-retry-title"
        data-testid="webhook-retry-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="webhooks-confirm-icon-box retry">
          <RefreshCw size={26} className={loading ? 'animate-spin' : ''} />
        </div>

        <h3 id="confirm-retry-title" className="webhooks-confirm-title">
          Reenviar Webhook?
        </h3>

        <p className="webhooks-confirm-message">
          Deseja reexecutar o envio do evento <strong>"{eventLabel}"</strong>?
          <span className="webhooks-confirm-url">{log.url}</span>
        </p>

        <p className="webhooks-confirm-subtext">
          Uma nova requisição HTTP POST será disparada com o mesmo payload. O retorno será gravado no histórico.
        </p>

        <div className="webhooks-confirm-actions">
          <button
            type="button"
            className="webhooks-btn-secondary"
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-retry-webhook-btn"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="webhooks-confirm-primary-btn"
            onClick={onConfirm}
            disabled={loading}
            data-testid="confirm-retry-webhook-btn"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Reenviando...' : 'Sim, Reenviar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
