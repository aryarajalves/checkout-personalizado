import React, { useState } from 'react';

export default function BuyerPixModal({ order, onClose, addToast }) {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const handleCopyPix = () => {
    if (!order.qr_code_text) return;
    navigator.clipboard.writeText(order.qr_code_text);
    setCopied(true);
    addToast?.('Código Pix Copia e Cola copiado com sucesso!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const formattedAmount = Number(order.amount_brl || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="buyer-modal-backdrop" role="dialog" aria-modal="true">
      <div className="buyer-modal-panel">
        <div className="buyer-modal-header">
          <div className="buyer-modal-title-group">
            <span className="pix-icon-badge">⚡ Pix</span>
            <h2 className="buyer-modal-title">Pagar Pedido via Pix</h2>
          </div>
          <button
            type="button"
            className="buyer-modal-close-btn"
            onClick={onClose}
            aria-label="Fechar modal de Pix"
          >
            ✕
          </button>
        </div>

        <div className="buyer-modal-body">
          <div className="pix-order-summary-box">
            <div className="pix-summary-row">
              <span className="pix-summary-label">Produto:</span>
              <strong className="pix-summary-value">{order.product_name}</strong>
            </div>
            <div className="pix-summary-row">
              <span className="pix-summary-label">Código do Pedido:</span>
              <span className="pix-summary-code">{order.order_code}</span>
            </div>
            <div className="pix-summary-row highlight">
              <span className="pix-summary-label">Total a Pagar:</span>
              <span className="pix-summary-price">{formattedAmount}</span>
            </div>
          </div>

          {order.qr_code_base64 && (
            <div className="pix-qr-container">
              <img
                src={order.qr_code_base64.startsWith('data:') ? order.qr_code_base64 : `data:image/png;base64,${order.qr_code_base64}`}
                alt="QR Code Pix"
                className="pix-qr-image"
              />
            </div>
          )}

          <div className="pix-instructions-card">
            <ol className="pix-instructions-list">
              <li>Abra o aplicativo do seu banco ou carteira digital.</li>
              <li>Escolha a opção <strong>Pix com QR Code</strong> ou <strong>Pix Copia e Cola</strong>.</li>
              <li>Escaneie o código acima ou copie o código abaixo.</li>
              <li>A confirmação é imediata e o acesso será liberado em segundos!</li>
            </ol>
          </div>

          <div className="pix-copy-section">
            <label className="pix-copy-label">Código Pix Copia e Cola:</label>
            <div className="pix-copy-input-row">
              <input
                type="text"
                readOnly
                value={order.qr_code_text || ''}
                className="pix-copy-text"
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`pix-btn-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopyPix}
              >
                {copied ? '✓ Copiado!' : 'Copiar Chave'}
              </button>
            </div>
          </div>
        </div>

        <div className="buyer-modal-footer">
          <button type="button" className="buyer-btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
