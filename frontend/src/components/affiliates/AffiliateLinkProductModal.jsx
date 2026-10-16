import React, { useState } from 'react';
import { X, Loader2, Link2, Percent, Tag } from 'lucide-react';

export default function AffiliateLinkProductModal({
  isOpen,
  onClose,
  onSubmit,
  affiliate,
  products = [],
  loading = false,
}) {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [customRefCode, setCustomRefCode] = useState('');

  if (!isOpen || !affiliate) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      product_id: parseInt(productId, 10),
      commission_percent: commissionPercent !== '' ? parseFloat(commissionPercent) : null,
      custom_ref_code: customRefCode.trim() || null,
    });
  };

  return (
    <div className="affiliate-modal-overlay" data-testid="link-product-modal">
      <div className="affiliate-modal-card">
        <div className="affiliate-modal-header">
          <h3>Vincular Produto a {affiliate.name}</h3>
          <button
            type="button"
            className="btn-icon-subtle"
            onClick={onClose}
            aria-label="Fechar modal"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="affiliate-modal-body">
            <div className="affiliate-form-group">
              <label>Selecione o Produto *</label>
              <select
                required
                className="affiliate-form-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Selecione um produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (R$ {Number(p.price_brl || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="affiliate-form-group">
              <label>
                Comissão Específica (%) - Opcional
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className="affiliate-form-input"
                placeholder={`Padrão do afiliado: ${affiliate.default_commission_percent}%`}
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Deixe em branco para herdar os {affiliate.default_commission_percent}% padrão do parceiro.
              </span>
            </div>

            <div className="affiliate-form-group">
              <label>Código Customizado para este Produto (Opcional)</label>
              <input
                type="text"
                className="affiliate-form-input"
                placeholder={`Padrão: ${affiliate.affiliate_code}`}
                value={customRefCode}
                onChange={(e) =>
                  setCustomRefCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                }
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Gera link com parâmetro ?ref={customRefCode || affiliate.affiliate_code}
              </span>
            </div>
          </div>

          <div className="affiliate-modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-affiliate"
              disabled={loading || !productId}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Vinculando...
                </>
              ) : (
                <>
                  <Link2 size={16} />
                  Vincular Produto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
