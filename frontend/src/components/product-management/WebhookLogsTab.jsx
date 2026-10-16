import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock, Eye, X, Copy, Check } from 'lucide-react';
import { retryWebhookDispatchApi } from './productApi';
import { AVAILABLE_EVENTS } from './WebhooksConfigTab';
import { WebhookRetryConfirmModal } from './WebhookRetryConfirmModal';

export function formatBrasiliaDateTime(dateString) {
  if (!dateString) return '-';
  try {
    let str = String(dateString).trim();
    if (!str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str += 'Z';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function WebhookLogsTab({ product, logs, logsLoading, onReload, showFeedback }) {
  const [retryConfirm, setRetryConfirm] = useState({ isOpen: false, log: null, loading: false });
  const [viewingPayload, setViewingPayload] = useState(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const handleOpenRetryConfirm = (log) => {
    setRetryConfirm({ isOpen: true, log, loading: false });
  };

  const handleCloseRetryConfirm = () => {
    if (retryConfirm.loading) return;
    setRetryConfirm({ isOpen: false, log: null, loading: false });
  };

  const handleConfirmRetry = async () => {
    if (!retryConfirm.log) return;
    try {
      setRetryConfirm((prev) => ({ ...prev, loading: true }));
      const res = await retryWebhookDispatchApi(product.id, retryConfirm.log.id);
      if (res.success) {
        showFeedback('success', `Reenvio concluído com sucesso! (Status: HTTP ${res.response_status_code})`);
      } else {
        showFeedback('error', `Falha no reenvio: ${res.error_message || 'Erro'}`);
      }
      setRetryConfirm({ isOpen: false, log: null, loading: false });
      onReload();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao reenviar webhook.');
      setRetryConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Histórico detalhado dos últimos disparos realizados para este produto com status de retorno HTTP.
        </span>
        <button
          type="button"
          disabled={logsLoading}
          onClick={onReload}
          className="webhooks-btn-secondary"
          data-testid="refresh-logs-btn"
        >
          <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="webhooks-empty-state">
          <div className="webhooks-empty-icon">
            <Clock size={24} />
          </div>
          <h4 className="webhooks-empty-title">Nenhum disparo registrado ainda</h4>
          <p className="webhooks-empty-desc">
            Os disparos aparecerão aqui automaticamente assim que pedidos forem gerados, pagos ou atualizados.
          </p>
        </div>
      ) : (
        <div className="webhooks-logs-table-card">
          <table className="webhooks-logs-table">
            <thead>
              <tr>
                <th style={{ width: '150px', whiteSpace: 'nowrap' }}>Data / Hora</th>
                <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Evento</th>
                <th>URL Destino</th>
                <th style={{ width: '120px', whiteSpace: 'nowrap' }}>Status</th>
                <th className="actions-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isSuccess = log.success;
                const evtMeta = AVAILABLE_EVENTS.find((e) => e.id === log.event || e.label === log.event);

                return (
                  <tr key={log.id} data-testid={`log-row-${log.id}`}>
                    <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }} data-testid={`log-date-${log.id}`}>
                      {formatBrasiliaDateTime(log.dispatched_at)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`webhook-event-chip ${evtMeta ? evtMeta.chipClass : 'expired'}`}>
                        {evtMeta ? evtMeta.label : log.event}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.url}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>
                        {log.url}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
                          color: isSuccess ? '#059669' : '#dc2626',
                          border: `1px solid ${isSuccess ? '#a7f3d0' : '#fecaca'}`,
                        }}
                      >
                        {isSuccess ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{log.response_status_code ? `HTTP ${log.response_status_code}` : log.error_message || 'Falha'}</span>
                      </span>
                    </td>
                    <td className="actions-col">
                      <div className="webhooks-table-actions">
                        <button
                          type="button"
                          onClick={() => setViewingPayload(log.payload)}
                          className="webhooks-btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                          title="Ver payload JSON"
                          data-testid={`view-payload-btn-${log.id}`}
                        >
                          <Eye size={13} />
                          <span>Payload</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRetryConfirm(log)}
                          className="webhooks-btn-primary webhooks-retry-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px' }}
                          title="Reenviar este webhook"
                          data-testid={`retry-webhook-btn-${log.id}`}
                        >
                          <RefreshCw size={12} />
                          <span>Reenviar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Inspector de Payload JSON */}
      {viewingPayload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setViewingPayload(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Payload JSON Disparado</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(typeof viewingPayload === 'string' ? viewingPayload : JSON.stringify(viewingPayload, null, 2))}
                  className="webhooks-btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  {copiedPayload ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedPayload ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewingPayload(null)}
                className="webhooks-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <pre className="webhooks-payload-viewer">
              {typeof viewingPayload === 'string'
                ? (() => {
                    try {
                      return JSON.stringify(JSON.parse(viewingPayload), null, 2);
                    } catch {
                      return viewingPayload;
                    }
                  })()
                : JSON.stringify(viewingPayload, null, 2)}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => setViewingPayload(null)}
                className="webhooks-btn-secondary"
                style={{ padding: '6px 14px', fontSize: '12.5px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reenvio */}
      <WebhookRetryConfirmModal
        isOpen={retryConfirm.isOpen}
        log={retryConfirm.log}
        loading={retryConfirm.loading}
        onConfirm={handleConfirmRetry}
        onClose={handleCloseRetryConfirm}
      />
    </div>
  );
}
