import React, { useState } from 'react';
import { MessageCircle, CheckCircle, RefreshCw, ExternalLink, Search, Tag, Clock } from 'lucide-react';
import { updateAbandonedCartApi, resendAbandonedWebhookApi } from './recoveryApi';

export default function AbandonedCartsTab({
  carts = [],
  loading = false,
  onReload,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) {
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const handleOpenWhatsApp = (cart) => {
    const rawPhone = (cart.customer_phone || '').replace(/\D/g, '');
    const ddi = (cart.customer_phone_ddi || '55').replace(/\D/g, '');
    const phoneFull = rawPhone.startsWith(ddi) ? rawPhone : `${ddi}${rawPhone}`;
    const baseUrl = window.location.origin;
    const recLink = cart.recovery_url ? `${baseUrl}${cart.recovery_url}` : '';

    const text = `Olá ${cart.customer_name}! Vi que você iniciou sua inscrição no *${cart.product_name || 'produto'}*, mas não chegou a concluir. Ficou com alguma dúvida ou teve dificuldade no pagamento? Se quiser finalizar com segurança, aqui está o seu link direto: ${recLink}`;

    const waUrl = `https://wa.me/${phoneFull}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Marca como contatado automaticamente
    if (!cart.contacted) {
      handleToggleContacted(cart, true);
    }
  };

  const handleToggleContacted = async (cart, forceValue = null) => {
    try {
      setActionLoadingId(cart.id);
      const nextVal = forceValue !== null ? forceValue : !cart.contacted;
      await updateAbandonedCartApi(cart.id, { contacted: nextVal });
      if (onReload) onReload();
    } catch (err) {
      setFeedbackMsg(`Erro ao atualizar: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusChange = async (cart, newStatus) => {
    try {
      setActionLoadingId(cart.id);
      await updateAbandonedCartApi(cart.id, { status: newStatus });
      setFeedbackMsg('Status do carrinho atualizado com sucesso.');
      if (onReload) onReload();
    } catch (err) {
      setFeedbackMsg(`Erro ao alterar status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResendWebhook = async (cart) => {
    try {
      setActionLoadingId(cart.id);
      const res = await resendAbandonedWebhookApi(cart.id);
      setFeedbackMsg(res.message || 'Webhook reenviado.');
    } catch (err) {
      setFeedbackMsg(`Erro ao reenviar: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="recovery-tab-content" data-testid="abandoned-carts-tab">
      {/* Barra de Filtros */}
      <div className="recovery-filters-bar">
        <div className="recovery-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="recovery-search-input"
            data-testid="search-abandoned-input"
          />
        </div>

        <div className="recovery-status-filters">
          {['all', 'abandoned', 'recovered', 'converted'].map((st) => (
            <button
              key={st}
              className={`recovery-filter-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => onStatusFilterChange(st)}
            >
              {st === 'all' && 'Todos'}
              {st === 'abandoned' && 'Abandonados'}
              {st === 'recovered' && 'Recuperados'}
              {st === 'converted' && 'Convertidos'}
            </button>
          ))}
        </div>
      </div>

      {feedbackMsg && (
        <div className="recovery-alert-banner">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="alert-close-btn">×</button>
        </div>
      )}

      {/* Tabela de Carrinhos */}
      <div className="recovery-table-card">
        {loading ? (
          <div className="recovery-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Carregando carrinhos abandonados...</p>
          </div>
        ) : carts.length === 0 ? (
          <div className="recovery-empty-state">
            <p>Nenhum carrinho abandonado encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="recovery-table-responsive">
            <table className="recovery-table" data-testid="abandoned-carts-table">
              <thead>
                <tr>
                  <th>Lead / Contato</th>
                  <th>Produto / Oferta</th>
                  <th>Valor Estimado</th>
                  <th>Data & Hora</th>
                  <th>Status</th>
                  <th>Ações de Recuperação</th>
                </tr>
              </thead>
              <tbody>
                {carts.map((cart) => (
                  <tr key={cart.id} className={`cart-row ${cart.status}`}>
                    {/* Lead */}
                    <td>
                      <div className="lead-info-col">
                        <span className="lead-name">{cart.customer_name}</span>
                        <span className="lead-email">{cart.customer_email}</span>
                        <span className="lead-phone">{cart.customer_phone_formatted || cart.customer_phone}</span>
                      </div>
                    </td>

                    {/* Produto */}
                    <td>
                      <div className="product-info-col">
                        <span className="product-name">{cart.product_name || 'Produto'}</span>
                        {cart.offer_name && <span className="offer-badge">{cart.offer_name}</span>}
                        {cart.coupon_code && (
                          <span className="coupon-tag">
                            <Tag size={12} /> {cart.coupon_code}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Valor Estimado */}
                    <td>
                      <span className="amount-cell">
                        R$ {Number(cart.estimated_amount_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Data */}
                    <td>
                      <div className="date-info-col">
                        <Clock size={12} />
                        <span>{new Date(cart.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-pill ${cart.status}`}>
                        {cart.status === 'abandoned' && 'Abandonado'}
                        {cart.status === 'recovered' && 'Recuperado'}
                        {cart.status === 'converted' && 'Convertido'}
                      </span>
                      {cart.contacted && (
                        <span className="contacted-pill">
                          <CheckCircle size={10} /> Contatado
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td>
                      <div className="action-buttons-group">
                        {/* Botão WhatsApp */}
                        <button
                          type="button"
                          className="action-btn-whatsapp"
                          title="Chamar no WhatsApp com mensagem de recuperação"
                          onClick={() => handleOpenWhatsApp(cart)}
                          data-testid={`btn-whatsapp-${cart.id}`}
                        >
                          <MessageCircle size={14} /> Chamar no WhatsApp
                        </button>

                        {/* Botão Alterar Status */}
                        {cart.status === 'abandoned' && (
                          <button
                            type="button"
                            className="action-btn-secondary"
                            title="Marcar como Recuperado"
                            onClick={() => handleStatusChange(cart, 'recovered')}
                            disabled={actionLoadingId === cart.id}
                          >
                            Recuperado
                          </button>
                        )}

                        {/* Reenviar Webhook */}
                        <button
                          type="button"
                          className="action-btn-icon"
                          title="Reenviar webhook de abandono (n8n/ZapVoice)"
                          onClick={() => handleResendWebhook(cart)}
                          disabled={actionLoadingId === cart.id}
                        >
                          <RefreshCw size={14} />
                        </button>

                        {/* Link Direto */}
                        {cart.recovery_url && (
                          <a
                            href={cart.recovery_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn-icon"
                            title="Abrir checkout de recuperação"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
