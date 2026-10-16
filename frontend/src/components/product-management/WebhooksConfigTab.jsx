import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Send, CheckCircle2, ShieldCheck, Radio } from 'lucide-react';
import {
  createProductWebhookApi,
  updateProductWebhookApi,
  deleteProductWebhookApi,
  testProductWebhookApi,
} from './productApi';
import { WebhookDeleteConfirmModal } from './WebhookDeleteConfirmModal';

export const AVAILABLE_EVENTS = [
  { id: 'order.approved', label: 'Compra Aprovada', chipClass: 'approved' },
  { id: 'order.waiting_payment', label: 'Pix Gerado', chipClass: 'waiting' },
  { id: 'order.refunded', label: 'Reembolso', chipClass: 'refunded' },
  { id: 'order.chargeback', label: 'Chargeback', chipClass: 'chargeback' },
  { id: 'order.card_declined', label: 'Cartão Recusado', chipClass: 'declined' },
  { id: 'order.expired', label: 'Pix Expirado', chipClass: 'expired' },
];

export function WebhooksConfigTab({ product, webhooks, onReload, showFeedback }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['order.approved', 'order.waiting_payment']);
  const [isActive, setIsActive] = useState(true);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    webhook: null,
    loading: false,
  });

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setUrl('');
    setSecretKey('');
    setSelectedEvents(['order.approved', 'order.waiting_payment']);
    setIsActive(true);
  };

  const handleEdit = (wh) => {
    setIsEditing(true);
    setEditingId(wh.id);
    setName(wh.name || '');
    setUrl(wh.url);
    setSecretKey(wh.secret_key || '');
    setSelectedEvents(wh.events || []);
    setIsActive(wh.is_active);
  };

  const toggleEvent = (eventId) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const [testEvent, setTestEvent] = useState('order.approved');

  const handleTestWebhook = async (specificEvent = null) => {
    if (!url || !url.startsWith('http')) {
      showFeedback('error', 'Informe uma URL válida iniciando com http:// ou https://');
      return;
    }
    const evtToTest = specificEvent || testEvent || 'order.approved';
    try {
      setTesting(true);
      const result = await testProductWebhookApi(product.id, {
        url: url.trim(),
        secret_key: secretKey.trim() || null,
        event: evtToTest,
      });
      const evtLabel = AVAILABLE_EVENTS.find((e) => e.id === evtToTest)?.label || evtToTest;
      if (result.success) {
        showFeedback('success', `Teste de [${evtLabel}] bem-sucedido! Código: HTTP ${result.status_code}`);
      } else {
        showFeedback('error', `Falha no teste de [${evtLabel}]: ${result.error_message || 'Erro desconhecido'}`);
      }
      onReload();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao testar envio.');
    } finally {
      setTesting(false);
    }
  };

  const handleTestAllEvents = async () => {
    if (!url || !url.startsWith('http')) {
      showFeedback('error', 'Informe uma URL válida iniciando com http:// ou https://');
      return;
    }
    const eventsToTest = selectedEvents.length > 0 ? selectedEvents : ['order.approved'];
    try {
      setTesting(true);
      let successCount = 0;
      for (const evt of eventsToTest) {
        const res = await testProductWebhookApi(product.id, {
          url: url.trim(),
          secret_key: secretKey.trim() || null,
          event: evt,
        });
        if (res.success) successCount++;
      }
      showFeedback('success', `${successCount} de ${eventsToTest.length} disparos de teste entregues com sucesso!`);
      onReload();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao testar disparos.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!url || !url.startsWith('http')) {
      showFeedback('error', 'A URL do webhook deve começar com http:// ou https://');
      return;
    }
    if (selectedEvents.length === 0) {
      showFeedback('error', 'Selecione pelo menos 1 evento para o webhook.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim() || null,
        url: url.trim(),
        events: selectedEvents,
        secret_key: secretKey.trim() || null,
        is_active: isActive,
      };

      if (editingId) {
        await updateProductWebhookApi(product.id, editingId, payload);
        showFeedback('success', 'Webhook atualizado com sucesso!');
      } else {
        await createProductWebhookApi(product.id, payload);
        showFeedback('success', 'Webhook cadastrado com sucesso!');
      }
      resetForm();
      onReload();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar webhook.');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (webhook) => {
    setDeleteConfirmModal({ isOpen: true, webhook, loading: false });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmModal({ isOpen: false, webhook: null, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.webhook) return;
    try {
      setDeleteConfirmModal((prev) => ({ ...prev, loading: true }));
      await deleteProductWebhookApi(product.id, deleteConfirmModal.webhook.id);
      showFeedback('success', 'Webhook removido com sucesso!');
      closeDeleteConfirm();
      onReload();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao remover webhook.');
      setDeleteConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Cadastre as URLs (ex: n8n, Make, ActiveCampaign, Área de Membros) que receberão os eventos deste produto.
        </span>
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsEditing(true);
            }}
            className="webhooks-btn-primary"
            data-testid="add-webhook-btn"
          >
            <Plus size={15} />
            <span>Novo Webhook</span>
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="webhooks-form-card" data-testid="webhook-form">
          <div className="webhooks-form-header">
            <span className="webhooks-form-title">
              {editingId ? 'Editar Webhook' : 'Cadastrar Nova URL de Webhook'}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="webhooks-btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Cancelar
            </button>
          </div>

          <div className="webhooks-form-group">
            <label className="webhooks-form-label">
              Nome / Identificação do Webhook <span style={{ color: '#64748b', fontWeight: 400 }}>(Opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: n8n Principal, Área de Membros, Make, Notificação Telegram"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="webhooks-form-input"
              data-testid="input-webhook-name"
            />
            <div className="webhooks-form-hint">
              Identificador para diferenciar este webhook quando você tiver múltiplos produtos ou automações.
            </div>
          </div>

          <div className="webhooks-form-group">
            <label className="webhooks-form-label">
              URL de Destino <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://seu-servidor.com/webhook/checkout"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="webhooks-form-input"
              data-testid="input-webhook-url"
            />
          </div>

          <div className="webhooks-form-group">
            <label className="webhooks-form-label">
              Eventos Disparados <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div className="webhooks-events-grid">
              {AVAILABLE_EVENTS.map((evt) => {
                const isChecked = selectedEvents.includes(evt.id);
                return (
                  <div
                    key={evt.id}
                    onClick={() => toggleEvent(evt.id)}
                    className={`webhooks-event-toggle ${isChecked ? 'selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    data-testid={`toggle-event-${evt.id}`}
                  >
                    <span className="webhooks-event-name">{evt.label}</span>
                    <div className="webhooks-event-check">
                      {isChecked && <CheckCircle2 size={13} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label className="webhooks-form-label">Chave Secreta HMAC (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: secret_token_xyz"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="webhooks-form-input"
                style={{ fontFamily: 'monospace', fontSize: '12.5px' }}
                data-testid="input-webhook-secret"
              />
              <div className="webhooks-form-hint">
                Enviada no header <code>X-Webhook-Signature</code> como hash HMAC-SHA256.
              </div>
            </div>

            <div>
              <label className="webhooks-form-label">Status do Webhook</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  id="wh-active-toggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                  data-testid="toggle-webhook-active"
                />
                <label htmlFor="wh-active-toggle" style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}>
                  {isActive ? 'Ativo (Disparando eventos)' : 'Pausado (Não disparar)'}
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={testEvent}
                onChange={(e) => setTestEvent(e.target.value)}
                className="webhooks-form-input"
                style={{ width: 'auto', padding: '7px 10px', fontSize: '12px' }}
                title="Escolha qual status/evento deseja testar"
                data-testid="select-test-event"
              >
                {AVAILABLE_EVENTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    Testar: {e.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleTestWebhook(testEvent)}
                disabled={testing || !url}
                className="webhooks-btn-secondary"
                data-testid="btn-test-webhook"
                style={{ padding: '7px 12px', fontSize: '12.5px' }}
              >
                <Send size={13} className={testing ? 'animate-spin' : ''} />
                <span>{testing ? 'Testando...' : 'Testar Evento'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestAllEvents}
                disabled={testing || !url || selectedEvents.length === 0}
                className="webhooks-btn-secondary"
                title="Dispara um teste para cada evento que você marcou nos checkboxes"
                data-testid="btn-test-all-events"
                style={{ padding: '7px 12px', fontSize: '12.5px' }}
              >
                <Send size={13} className={testing ? 'animate-spin' : ''} />
                <span>Testar Todos ({selectedEvents.length})</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="webhooks-btn-primary"
              data-testid="btn-save-webhook"
            >
              <CheckCircle2 size={14} />
              <span>{loading ? 'Salvando...' : editingId ? 'Atualizar Webhook' : 'Salvar Webhook'}</span>
            </button>
          </div>
        </form>
      )}

      {webhooks.length === 0 ? (
        <div className="webhooks-empty-state">
          <div className="webhooks-empty-icon">
            <Radio size={24} />
          </div>
          <h4 className="webhooks-empty-title">Nenhum webhook cadastrado para este produto</h4>
          <p className="webhooks-empty-desc">
            Clique em <strong>"+ Novo Webhook"</strong> acima para conectar sua plataforma externa, n8n ou robô de WhatsApp.
          </p>
        </div>
      ) : (
        <div>
          {webhooks.map((wh) => (
            <div key={wh.id} className="webhook-item-card" data-testid={`webhook-card-${wh.id}`}>
              <div className="webhook-item-header">
                <div className="webhook-url-box">
                  <Radio size={16} style={{ color: '#4f46e5', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                    {wh.name && (
                      <span
                        style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}
                        data-testid={`webhook-name-${wh.id}`}
                      >
                        {wh.name}
                      </span>
                    )}
                    <span className="webhook-url-text">{wh.url}</span>
                  </div>
                  <span className={`webhook-status-pill ${wh.is_active ? 'active' : 'inactive'}`}>
                    {wh.is_active ? 'Ativo' : 'Pausado'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(wh)}
                    className="webhooks-btn-icon"
                    title="Editar webhook"
                    data-testid={`btn-edit-webhook-${wh.id}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(wh)}
                    className="webhooks-btn-icon danger"
                    title="Excluir webhook"
                    data-testid={`btn-delete-webhook-${wh.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="webhook-chips-container">
                {wh.events &&
                  wh.events.map((evtId) => {
                    const evt = AVAILABLE_EVENTS.find((e) => e.id === evtId);
                    return (
                      <span key={evtId} className={`webhook-event-chip ${evt ? evt.chipClass : 'expired'}`}>
                        {evt ? evt.label : evtId}
                      </span>
                    );
                  })}
              </div>

              {wh.secret_key && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11.5px', color: '#059669' }}>
                  <ShieldCheck size={14} />
                  <span>Assinatura HMAC-SHA256 Ativa</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Deleção Centralizado */}
      <WebhookDeleteConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        webhook={deleteConfirmModal.webhook}
        loading={deleteConfirmModal.loading}
        onConfirm={handleConfirmDelete}
        onClose={closeDeleteConfirm}
      />
    </div>
  );
}
