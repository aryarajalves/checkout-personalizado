import React, { useState } from 'react';
import { MessageCircle, CheckCircle, RefreshCw, ExternalLink, Search, Tag, Clock, Trash2 } from 'lucide-react';
import { updateAbandonedCartApi, resendAbandonedWebhookApi } from './recoveryApi';
import RecoveryPagination from './RecoveryPagination';
import ConfirmDeleteCartModal from './ConfirmDeleteCartModal';
import ConfirmResendWebhookModal from './ConfirmResendWebhookModal';

export default function AbandonedCartsTab({
  carts = [],
  totalCarts = 0,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  loading = false,
  onReload,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onDeleteCart,
  onBulkDeleteCarts,
}) {
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [selectedCartIds, setSelectedCartIds] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cartToDelete, setCartToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [cartToResend, setCartToResend] = useState(null);
  const [isResending, setIsResending] = useState(false);

  const allOnPageSelected = carts.length > 0 && carts.every((c) => selectedCartIds.includes(c.id));

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedCartIds((prev) => prev.filter((id) => !carts.some((c) => c.id === id)));
    } else {
      const pageIds = carts.map((c) => c.id);
      setSelectedCartIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectCart = (id) => {
    setSelectedCartIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenSingleDelete = (cart) => {
    setCartToDelete(cart);
    setDeleteModalOpen(true);
  };

  const handleOpenBulkDelete = () => {
    setCartToDelete(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (cartToDelete) {
        if (onDeleteCart) await onDeleteCart(cartToDelete.id);
        setSelectedCartIds((prev) => prev.filter((id) => id !== cartToDelete.id));
      } else {
        if (onBulkDeleteCarts) await onBulkDeleteCarts(selectedCartIds);
        setSelectedCartIds([]);
      }
      setDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
      setCartToDelete(null);
    }
  };

  const handleOpenWhatsApp = (cart) => {
    const rawPhone = (cart.customer_phone || '').replace(/\D/g, '');
    const ddi = (cart.customer_phone_ddi || '55').replace(/\D/g, '');
    const phoneFull = rawPhone.startsWith(ddi) ? rawPhone : `${ddi}${rawPhone}`;
    const baseUrl = window.location.origin;
    let recLink = cart.recovery_url ? `${baseUrl}${cart.recovery_url}` : '';

    if (recLink && !recLink.includes('name=')) {
      try {
        const url = new URL(recLink, baseUrl);
        if (cart.customer_name) url.searchParams.set('name', cart.customer_name);
        if (cart.customer_email) url.searchParams.set('email', cart.customer_email);
        if (cart.customer_phone) url.searchParams.set('phone', cart.customer_phone);
        if (cart.customer_phone_ddi && cart.customer_phone_ddi !== '55') url.searchParams.set('phone_ddi', cart.customer_phone_ddi);
        if (cart.customer_cpf) url.searchParams.set('cpf', cart.customer_cpf);
        if (cart.coupon_code) url.searchParams.set('coupon', cart.coupon_code);
        recLink = url.toString();
      } catch {
        // Fallback para o link original
      }
    }

    const text = `Olá ${cart.customer_name}! Vi que você iniciou sua inscrição no *${cart.product_name || 'produto'}*, mas não chegou a concluir. Ficou com alguma dúvida ou teve dificuldade no pagamento? Se quiser finalizar com segurança, aqui está o seu link direto: ${recLink}`;

    const waUrl = `https://wa.me/${phoneFull}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

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

  const handleOpenResendModal = (cart) => {
    setCartToResend(cart);
    setResendModalOpen(true);
  };

  const handleConfirmResend = async () => {
    if (!cartToResend) return;
    try {
      setIsResending(true);
      const res = await resendAbandonedWebhookApi(cartToResend.id);
      setFeedbackMsg(res.message || 'Webhook reenviado com sucesso.');
      setResendModalOpen(false);
      setCartToResend(null);
    } catch (err) {
      setFeedbackMsg(`Erro ao reenviar: ${err.message}`);
    } finally {
      setIsResending(false);
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
              data-testid={`filter-status-${st}`}
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

      {/* Barra Contextual de Ações em Massa */}
      {selectedCartIds.length > 0 && (
        <div className="recovery-bulk-actions-bar" data-testid="recovery-bulk-actions-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 600 }}>
              {selectedCartIds.length} {selectedCartIds.length === 1 ? 'carrinho selecionado' : 'carrinhos selecionados'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedCartIds([])}
              data-testid="btn-clear-selection-cart"
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                cursor: 'pointer',
                fontSize: '12.5px',
                textDecoration: 'underline',
                padding: '0 4px',
              }}
            >
              Desmarcar todos
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenBulkDelete}
            data-testid="btn-bulk-delete-cart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
            <span>Excluir selecionados ({selectedCartIds.length})</span>
          </button>
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
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={handleToggleSelectAll}
                      data-testid="select-all-carts-checkbox"
                      title="Selecionar todos da página atual"
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </th>
                  <th>Lead / Contato</th>
                  <th>Produto / Oferta</th>
                  <th>Valor Estimado</th>
                  <th>Data & Hora</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações de Recuperação</th>
                </tr>
              </thead>
              <tbody>
                {carts.map((cart) => {
                  const isSelected = selectedCartIds.includes(cart.id);
                  return (
                    <tr
                      key={cart.id}
                      className={`cart-row ${cart.status}`}
                      data-testid={`cart-row-${cart.id}`}
                      style={{ backgroundColor: isSelected ? '#f8fafc' : undefined }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCart(cart.id)}
                          data-testid={`select-cart-checkbox-${cart.id}`}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                      </td>

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
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-group">
                          {/* Botão WhatsApp */}
                          <button
                            type="button"
                            className="action-btn-whatsapp"
                            title="Chamar no WhatsApp com mensagem de recuperação"
                            onClick={() => handleOpenWhatsApp(cart)}
                            data-testid={`btn-whatsapp-${cart.id}`}
                          >
                            <MessageCircle size={14} />
                            <span>Chamar no WhatsApp</span>
                          </button>

                          {/* Botão Alterar Status */}
                          {cart.status === 'abandoned' && (
                            <button
                              type="button"
                              className="action-btn-secondary"
                              title="Marcar como Recuperado"
                              onClick={() => handleStatusChange(cart, 'recovered')}
                              disabled={actionLoadingId === cart.id}
                              data-testid={`btn-mark-recovered-${cart.id}`}
                            >
                              <CheckCircle size={13} />
                              <span>Recuperado</span>
                            </button>
                          )}

                          {/* Reenviar Webhook */}
                          <button
                            type="button"
                            className="action-btn-icon"
                            title="Reenviar webhook de abandono (n8n/ZapVoice)"
                            onClick={() => handleOpenResendModal(cart)}
                            data-testid={`btn-resend-webhook-${cart.id}`}
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
                              data-testid={`btn-open-recovery-${cart.id}`}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}

                          {/* Botão Excluir */}
                          <button
                            type="button"
                            className="action-btn-danger"
                            title="Excluir Carrinho Abandonado"
                            onClick={() => handleOpenSingleDelete(cart)}
                            data-testid={`btn-delete-cart-${cart.id}`}
                          >
                            <Trash2 size={14} />
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

        {/* Barra de Paginação (20 itens por página) */}
        <RecoveryPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalCarts || carts.length}
          onPageChange={onPageChange}
        />
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteCartModal
        isOpen={deleteModalOpen}
        cart={cartToDelete}
        selectedCount={selectedCartIds.length}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setCartToDelete(null);
        }}
      />

      {/* Modal de Confirmação de Reenvio de Webhook */}
      <ConfirmResendWebhookModal
        isOpen={resendModalOpen}
        cart={cartToResend}
        loading={isResending}
        onConfirm={handleConfirmResend}
        onCancel={() => {
          setResendModalOpen(false);
          setCartToResend(null);
        }}
      />
    </div>
  );
}
