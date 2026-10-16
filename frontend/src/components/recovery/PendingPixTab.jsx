import React, { useState } from 'react';
import { MessageCircle, Copy, Check, QrCode, Search, RefreshCw, Clock, X } from 'lucide-react';

export default function PendingPixTab({
  orders = [],
  loading = false,
  onReload,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) {
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const [selectedQrOrder, setSelectedQrOrder] = useState(null);

  const handleCopyPix = (order) => {
    if (!order.qr_code_text) return;
    navigator.clipboard.writeText(order.qr_code_text);
    setCopiedOrderId(order.order_id);
    setTimeout(() => setCopiedOrderId(null), 3000);
  };

  const handleOpenWhatsAppPix = (order) => {
    const rawPhone = (order.customer_phone || '').replace(/\D/g, '');
    const ddi = (order.customer_phone_ddi || '55').replace(/\D/g, '');
    const phoneFull = rawPhone.startsWith(ddi) ? rawPhone : `${ddi}${rawPhone}`;

    const formattedAmount = Number(order.amount_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const pixCode = order.qr_code_text || '(Código Pix indisponível)';

    const text = `Olá ${order.customer_name}! Vi que você gerou o Pix para o produto *${order.product_name}* no valor de R$ ${formattedAmount}, mas ainda não identificamos a confirmação.

Segue o código Pix Copia e Cola para facilitar o seu pagamento:
${pixCode}

Assim que for pago, o seu acesso é liberado imediatamente. Qualquer dúvida é só me chamar!`;

    const waUrl = `https://wa.me/${phoneFull}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="recovery-tab-content" data-testid="pending-pix-tab">
      {/* Barra de Filtros */}
      <div className="recovery-filters-bar">
        <div className="recovery-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por código, nome, e-mail ou WhatsApp..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="recovery-search-input"
            data-testid="search-pix-input"
          />
        </div>

        <div className="recovery-status-filters">
          {[
            { id: 'pending', label: 'Aguardando Pagamento' },
            { id: 'paid', label: 'Pagos' },
            { id: 'all', label: 'Todos os Pix' },
          ].map((st) => (
            <button
              key={st.id}
              className={`recovery-filter-btn ${statusFilter === st.id ? 'active' : ''}`}
              onClick={() => onStatusFilterChange(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Pedidos Pix */}
      <div className="recovery-table-card">
        {loading ? (
          <div className="recovery-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Carregando pedidos Pix...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="recovery-empty-state">
            <p>Nenhum pedido Pix encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="recovery-table-responsive">
            <table className="recovery-table" data-testid="pending-pix-table">
              <thead>
                <tr>
                  <th>Código / Data</th>
                  <th>Cliente</th>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Chave Pix Copia e Cola</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id} className={`pix-row ${order.status}`}>
                    {/* Código do Pedido */}
                    <td>
                      <div className="order-code-col">
                        <span className="order-code-badge">{order.order_code}</span>
                        <div className="order-date-text">
                          <Clock size={12} />
                          <span>{new Date(order.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td>
                      <div className="lead-info-col">
                        <span className="lead-name">{order.customer_name}</span>
                        <span className="lead-email">{order.customer_email}</span>
                        <span className="lead-phone">{order.customer_phone_formatted || order.customer_phone}</span>
                      </div>
                    </td>

                    {/* Produto */}
                    <td>
                      <div className="product-info-col">
                        <span className="product-name">{order.product_name}</span>
                        {order.offer_name && <span className="offer-badge">{order.offer_name}</span>}
                      </div>
                    </td>

                    {/* Valor */}
                    <td>
                      <span className="amount-cell highlighted">
                        R$ {Number(order.amount_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-pill ${order.status}`}>
                        {order.status === 'pending' && 'Aguardando'}
                        {order.status === 'waiting_payment' && 'Aguardando'}
                        {order.status === 'paid' && 'Pago'}
                        {order.status === 'expired' && 'Expirado'}
                      </span>
                    </td>

                    {/* Chave Pix Copia e Cola */}
                    <td>
                      {order.qr_code_text ? (
                        <div className="pix-copy-cell">
                          <input
                            type="text"
                            readOnly
                            value={order.qr_code_text}
                            className="pix-snippet-input"
                            title={order.qr_code_text}
                          />
                          <button
                            type="button"
                            className="pix-inline-copy-btn"
                            onClick={() => handleCopyPix(order)}
                            title="Copiar Chave Copia e Cola"
                            data-testid={`btn-copy-pix-${order.order_id}`}
                          >
                            {copiedOrderId === order.order_id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Indisponível</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td>
                      <div className="action-buttons-group">
                        {/* Chamar no WhatsApp */}
                        <button
                          type="button"
                          className="action-btn-whatsapp"
                          title="Enviar WhatsApp de recuperação com o código Pix pronto"
                          onClick={() => handleOpenWhatsAppPix(order)}
                          data-testid={`btn-wa-pix-${order.order_id}`}
                        >
                          <MessageCircle size={14} /> Chamar no WhatsApp
                        </button>

                        {/* Visualizar QR Code */}
                        {(order.qr_code_base64 || order.qr_code_text) && (
                          <button
                            type="button"
                            className="action-btn-icon"
                            title="Visualizar QR Code Pix"
                            onClick={() => setSelectedQrOrder(order)}
                          >
                            <QrCode size={14} />
                          </button>
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

      {/* Modal Visualização de QR Code */}
      {selectedQrOrder && (
        <div className="recovery-modal-backdrop" data-testid="qr-code-modal">
          <div className="recovery-modal-panel">
            <div className="recovery-modal-header">
              <h3>QR Code Pix - Pedido #{selectedQrOrder.order_code}</h3>
              <button
                type="button"
                className="recovery-modal-close"
                onClick={() => setSelectedQrOrder(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="recovery-modal-body text-center">
              <p className="modal-lead-info">
                Cliente: <strong>{selectedQrOrder.customer_name}</strong> • Valor: <strong>R$ {Number(selectedQrOrder.amount_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
              {selectedQrOrder.qr_code_base64 ? (
                <div className="qr-image-wrapper">
                  <img
                    src={`data:image/png;base64,${selectedQrOrder.qr_code_base64}`}
                    alt="QR Code Pix"
                    className="qr-image"
                  />
                </div>
              ) : (
                <p className="text-muted">QR Code em imagem não disponível para este pedido.</p>
              )}
              {selectedQrOrder.qr_code_text && (
                <div className="qr-code-text-box">
                  <label>Código Pix Copia e Cola:</label>
                  <textarea readOnly rows={3} value={selectedQrOrder.qr_code_text} className="qr-textarea" />
                  <button
                    type="button"
                    className="action-btn-primary full-width mt-2"
                    onClick={() => handleCopyPix(selectedQrOrder)}
                  >
                    {copiedOrderId === selectedQrOrder.order_id ? '✓ Código Copiado!' : 'Copiar Código Pix'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
