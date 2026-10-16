import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Radio, Clock } from 'lucide-react';
import { fetchProductWebhooksApi, fetchWebhookDispatchLogsApi } from './productApi';
import { WebhooksConfigTab } from './WebhooksConfigTab';
import { WebhookLogsTab } from './WebhookLogsTab';

export function ProductWebhooksModal({ product, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('webhooks');
  const [webhooks, setWebhooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen && product) {
      loadWebhooks();
      loadLogs();
    }
  }, [isOpen, product]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadWebhooks = async () => {
    if (!product) return;
    try {
      const data = await fetchProductWebhooksApi(product.id);
      setWebhooks(data);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar webhooks.');
    }
  };

  const loadLogs = async () => {
    if (!product) return;
    try {
      setLogsLoading(true);
      const data = await fetchWebhookDispatchLogsApi(product.id);
      setLogs(data);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar histórico de disparos.');
    } finally {
      setLogsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-webhooks-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Mantém backdrop sem fechar acidentalmente
        }
      }}
    >
      <div
        className="webhooks-modal-dialog"
        data-testid="product-webhooks-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="webhooks-modal-header">
          <div className="webhooks-title-group">
            <div className="webhooks-badge-icon">
              <Radio size={22} />
            </div>
            <div>
              <h2 className="webhooks-modal-title">
                Webhooks de Saída
                <span className="webhooks-product-tag">
                  {product.name}
                </span>
              </h2>
              <p className="webhooks-modal-subtitle">
                Notificações em tempo real para automações, n8n, Make e plataformas externas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="webhooks-close-btn"
            title="Fechar modal"
            aria-label="Fechar modal"
            data-testid="close-webhooks-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`webhooks-feedback-banner ${feedback.type}`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="webhooks-tabs-bar">
          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`webhooks-tab-btn ${activeTab === 'webhooks' ? 'active' : ''}`}
            data-testid="tab-webhooks-config"
          >
            <Radio size={16} />
            <span>Configurações de Webhook</span>
            <span className="webhooks-tab-count">{webhooks.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`webhooks-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            data-testid="tab-webhooks-logs"
          >
            <Clock size={16} />
            <span>Histórico de Disparos</span>
            <span className="webhooks-tab-count">{logs.length}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="webhooks-modal-body">
          {activeTab === 'webhooks' ? (
            <WebhooksConfigTab
              product={product}
              webhooks={webhooks}
              onReload={loadWebhooks}
              showFeedback={showFeedback}
            />
          ) : (
            <WebhookLogsTab
              product={product}
              logs={logs}
              logsLoading={logsLoading}
              onReload={loadLogs}
              showFeedback={showFeedback}
            />
          )}
        </div>

        {/* Footer */}
        <div className="webhooks-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="webhooks-btn-secondary"
            data-testid="footer-close-webhooks-modal-btn"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
