import React, { useState, useEffect } from 'react';
import { Package, X, Check } from 'lucide-react';

export default function ProductModal({
  isOpen,
  product,
  loading,
  onSave,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price_brl: '',
    price_usd: '',
    payment_methods: 'all',
    is_active: true,
    require_cpf: false,
    meta_pixel_id: '',
    thank_you_url: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        price_brl: product.price_brl !== undefined ? product.price_brl : '',
        price_usd: product.price_usd !== undefined && product.price_usd !== null ? product.price_usd : '',
        payment_methods: product.payment_methods || 'all',
        is_active: product.is_active !== undefined ? product.is_active : true,
        require_cpf: product.require_cpf !== undefined ? product.require_cpf : false,
        meta_pixel_id: product.meta_pixel_id || '',
        thank_you_url: product.thank_you_url || '',
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        price_brl: '',
        price_usd: '',
        payment_methods: 'all',
        is_active: true,
        require_cpf: false,
        meta_pixel_id: '',
        thank_you_url: '',
      });
    }
    setErrors({});
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val) => {
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (!product) {
        const autoSlug = val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        updated.slug = autoSlug;
      }
      return updated;
    });
  };

  const handleSlugChange = (val) => {
    const cleaned = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/g, '-');
    setFormData((prev) => ({ ...prev, slug: cleaned }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'O nome do produto é obrigatório.';
    if (!formData.slug.trim()) newErrors.slug = 'O slug da URL é obrigatório.';
    if (formData.price_brl === '' || Number(formData.price_brl) < 0) {
      newErrors.price_brl = 'Informe um preço válido em BRL (mínimo R$ 0,00).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim() || null,
      price_brl: parseFloat(formData.price_brl),
      price_usd: formData.price_usd !== '' ? parseFloat(formData.price_usd) : null,
      payment_methods: formData.payment_methods,
      is_active: formData.is_active,
      require_cpf: formData.require_cpf,
      meta_pixel_id: formData.meta_pixel_id ? formData.meta_pixel_id.trim() : null,
      thank_you_url: formData.thank_you_url ? formData.thank_you_url.trim() : null,
    };

    onSave(payload);
  };

  return (
    <div
      className="modal-backdrop-custom modal-overlay"
      data-testid="product-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="product-modal-dialog"
        data-testid="product-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="product-modal-header">
          <div className="product-modal-title-group">
            <div className="product-modal-icon-badge blue">
              <Package size={22} />
            </div>
            <div>
              <h3 className="product-modal-title">
                {product ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <span className="product-modal-subtitle">
                Configure a precificação e a identificação pública de checkout
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="product-modal-close-btn"
            title="Fechar modal"
            data-testid="header-close-product-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Nome do Produto *</label>
            <input
              type="text"
              className="form-control-modern"
              placeholder="Ex: Formação Cripto Pro"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              data-testid="input-product-name"
            />
            {errors.name && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{errors.name}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Slug da URL de Pagamento *</label>
            <div className="slug-input-container">
              <span className="slug-prefix">/pay/</span>
              <input
                type="text"
                className="slug-text-input"
                placeholder="formacao-cripto-pro"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                data-testid="input-product-slug"
              />
            </div>
            {errors.slug && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{errors.slug}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Preço em Reais (BRL) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control-modern"
                placeholder="97.00"
                value={formData.price_brl}
                onChange={(e) => setFormData((p) => ({ ...p, price_brl: e.target.value }))}
                data-testid="input-product-price-brl"
              />
              {errors.price_brl && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{errors.price_brl}</span>}
            </div>

            <div className="form-group">
              <label>Preço em Dólar / USDC</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control-modern"
                placeholder="20.00 (opcional)"
                value={formData.price_usd}
                onChange={(e) => setFormData((p) => ({ ...p, price_usd: e.target.value }))}
                data-testid="input-product-price-usd"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Métodos de Pagamento Permitidos</label>
            <select
              className="form-control-modern"
              value={formData.payment_methods}
              onChange={(e) => setFormData((p) => ({ ...p, payment_methods: e.target.value }))}
              data-testid="select-product-payment-methods"
            >
              <option value="all">Todos (Pix, Cartão e Criptomoedas)</option>
              <option value="pix_card">Apenas Tradicional (Pix e Cartão)</option>
              <option value="crypto_only">Apenas Criptomoedas (MetaMask)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Descrição da Oferta</label>
            <textarea
              className="form-control-modern"
              rows={3}
              placeholder="Descreva o que o comprador receberá ao pagar..."
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              data-testid="input-product-description"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>ID do Pixel do Meta / Facebook (Opcional)</label>
            <input
              type="text"
              className="form-control-modern"
              placeholder="Ex: 1234567890123456"
              value={formData.meta_pixel_id}
              onChange={(e) => setFormData((p) => ({ ...p, meta_pixel_id: e.target.value }))}
              data-testid="input-product-meta-pixel-id"
            />
            <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Dispara automaticamente os eventos de PageView, InitiateCheckout e Purchase no checkout.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>URL da Página de Obrigado (Opcional)</label>
            <input
              type="url"
              className="form-control-modern"
              placeholder="https://meusite.com/obrigado (deixe vazio para usar a padrão)"
              value={formData.thank_you_url}
              onChange={(e) => setFormData((p) => ({ ...p, thank_you_url: e.target.value }))}
              data-testid="input-product-thank-you-url"
            />
            <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Redireciona o comprador após o pagamento (ou após o UpSell). Se deixar vazio, usará a Página de Obrigado padrão do sistema.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <input
              type="checkbox"
              id="product-active-toggle"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              data-testid="toggle-product-active"
              style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
            />
            <label htmlFor="product-active-toggle" style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
              Produto Ativo e liberado para vendas
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <input
              type="checkbox"
              id="product-require-cpf-toggle"
              checked={formData.require_cpf}
              onChange={(e) => setFormData((p) => ({ ...p, require_cpf: e.target.checked }))}
              data-testid="toggle-product-require-cpf"
              style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer', marginTop: '2px' }}
            />
            <div>
              <label htmlFor="product-require-cpf-toggle" style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', margin: 0, display: 'block' }}>
                Exigir CPF do comprador no checkout
              </label>
              <span style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', display: 'block' }}>
                Desative para um checkout mais rápido e com menor atrito (sem pedir CPF).
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="secondary-action-btn"
              onClick={onCancel}
              disabled={loading}
              data-testid="cancel-product-btn"
            >
              <X size={15} />
              <span>Cancelar</span>
            </button>
            <button
              type="submit"
              className="primary-action-btn"
              disabled={loading}
              data-testid="save-product-btn"
            >
              <Check size={15} />
              <span>{loading ? 'Salvando...' : product ? 'Salvar Alterações' : 'Criar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
