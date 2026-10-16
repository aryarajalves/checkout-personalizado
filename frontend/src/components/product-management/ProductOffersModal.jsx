import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, X, Check, Copy, Star, DollarSign, Layers } from 'lucide-react';

export default function ProductOffersModal({
  isOpen,
  product,
  loading,
  copiedSlug,
  onCopyLink,
  onCreateOffer,
  onUpdateOffer,
  onDeleteOffer,
  onClose,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price_brl: '',
    price_usd: '',
    pricing_type: 'one_time',
    billing_cycle: 'monthly',
    is_default: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setIsAdding(false);
    setFormData({
      name: '',
      slug: '',
      price_brl: '',
      price_usd: '',
      pricing_type: 'one_time',
      billing_cycle: 'monthly',
      is_default: false,
    });
    setErrors({});
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const offers = product.offers || [];

  const handleNameChange = (val) => {
    setFormData((prev) => {
      const autoSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return {
        ...prev,
        name: val,
        slug: autoSlug ? `${product.slug}-${autoSlug}` : '',
      };
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
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Nome da oferta é obrigatório.';
    if (!formData.slug.trim()) errs.slug = 'Slug da oferta é obrigatório.';
    if (formData.price_brl === '' || Number(formData.price_brl) < 0) {
      errs.price_brl = 'Informe um preço válido em BRL.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveNewOffer = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onCreateOffer(product.id, {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      price_brl: parseFloat(formData.price_brl),
      price_usd: formData.price_usd !== '' ? parseFloat(formData.price_usd) : null,
      pricing_type: formData.pricing_type,
      billing_cycle: formData.pricing_type === 'recurring' ? formData.billing_cycle : 'monthly',
      is_default: formData.is_default,
      is_active: true,
    });

    setIsAdding(false);
    setFormData({
      name: '',
      slug: '',
      price_brl: '',
      price_usd: '',
      pricing_type: 'one_time',
      billing_cycle: 'monthly',
      is_default: false,
    });
  };

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div
      className="modal-backdrop-custom modal-overlay"
      data-testid="product-offers-modal-backdrop"
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
        data-testid="product-offers-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Cabeçalho */}
        <div className="product-modal-header">
          <div className="product-modal-title-group">
            <div className="product-modal-icon-badge blue">
              <Tag size={22} />
            </div>
            <div>
              <h3 className="product-modal-title">
                Ofertas & Preços: {product.name}
              </h3>
              <span className="product-modal-subtitle">
                O mesmo produto pode ter múltiplos preços, planos e links de checkout exclusivos
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="product-modal-close-btn"
            title="Fechar modal"
            data-testid="close-offers-modal-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de Ofertas Existentes */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>
              Ofertas Cadastradas ({offers.length})
            </span>
            {!isAdding && (
              <button
                type="button"
                className="primary-action-btn"
                onClick={() => setIsAdding(true)}
                style={{ padding: '7px 12px', fontSize: '13px' }}
                data-testid="open-add-offer-btn"
              >
                <Plus size={14} />
                <span>Nova Oferta / Preço</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="split-recipient-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  backgroundColor: offer.is_default ? '#fbfcfe' : '#ffffff',
                  border: offer.is_default ? '1.5px solid #bae6fd' : '1px solid #e2e8f0',
                }}
                data-testid={`offer-card-${offer.id}`}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14.5px' }}>
                      {offer.name}
                    </span>
                    {offer.is_default && (
                      <span
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Padrão
                      </span>
                    )}
                    {offer.pricing_type === 'recurring' && (
                      <span
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        Recorrente ({offer.billing_cycle === 'annual' ? 'Anual' : offer.billing_cycle === 'semiannual' ? 'Semestral' : offer.billing_cycle === 'quarterly' ? 'Trimestral' : 'Mensal'})
                      </span>
                    )}
                  </div>

                  <div className="product-slug-badge" style={{ marginTop: '6px' }}>
                    <span>/pay/{offer.slug}</span>
                    <button
                      type="button"
                      onClick={() => onCopyLink(offer.slug)}
                      className={`copy-slug-btn ${copiedSlug === offer.slug ? 'copied' : ''}`}
                      title="Copiar link de checkout desta oferta"
                      data-testid={`copy-offer-link-${offer.id}`}
                    >
                      {copiedSlug === offer.slug ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedSlug === offer.slug ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                      {formatBRL(offer.price_brl)}
                    </div>
                    {offer.price_usd && (
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        $ {offer.price_usd.toFixed(2)} USD
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!offer.is_default && (
                      <button
                        type="button"
                        onClick={() => onUpdateOffer(product.id, offer.id, { is_default: true })}
                        className="secondary-action-btn"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        title="Tornar esta a oferta padrão do produto"
                        data-testid={`make-default-offer-${offer.id}`}
                      >
                        <Star size={13} />
                        <span>Definir Padrão</span>
                      </button>
                    )}

                    {offers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteOffer(product.id, offer.id)}
                        className="action-delete-btn"
                        title="Excluir esta oferta"
                        data-testid={`delete-offer-${offer.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário para Cadastrar Nova Oferta */}
        {isAdding && (
          <form
            onSubmit={handleSaveNewOffer}
            style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              marginBottom: '20px',
            }}
            data-testid="new-offer-form"
          >
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Adicionar Nova Oferta / Preço
            </h4>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Nome da Oferta *</label>
              <input
                type="text"
                className="form-control-modern"
                placeholder="Ex: Promoção Black Friday ou Parcelado"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                data-testid="input-new-offer-name"
              />
              {errors.name && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.name}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Slug de Checkout (/pay/...) *</label>
              <div className="slug-input-container">
                <span className="slug-prefix">/pay/</span>
                <input
                  type="text"
                  className="slug-text-input"
                  placeholder="slug-da-nova-oferta"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  data-testid="input-new-offer-slug"
                />
              </div>
              {errors.slug && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.slug}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label>Preço em Reais (BRL) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control-modern"
                  placeholder="47.00"
                  value={formData.price_brl}
                  onChange={(e) => setFormData((p) => ({ ...p, price_brl: e.target.value }))}
                  data-testid="input-new-offer-price-brl"
                />
                {errors.price_brl && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.price_brl}</span>}
              </div>

              <div className="form-group">
                <label>Preço em Dólar / USDC</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control-modern"
                  placeholder="10.00 (opcional)"
                  value={formData.price_usd}
                  onChange={(e) => setFormData((p) => ({ ...p, price_usd: e.target.value }))}
                  data-testid="input-new-offer-price-usd"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: formData.pricing_type === 'recurring' ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label>Tipo de Cobrança</label>
                <select
                  className="form-control-modern"
                  value={formData.pricing_type}
                  onChange={(e) => setFormData((p) => ({ ...p, pricing_type: e.target.value }))}
                  data-testid="select-offer-pricing-type"
                >
                  <option value="one_time">Cobrança Única (Pagamento Único)</option>
                  <option value="recurring">Assinatura Recorrente</option>
                </select>
              </div>

              {formData.pricing_type === 'recurring' && (
                <div className="form-group">
                  <label>Ciclo de Faturamento</label>
                  <select
                    className="form-control-modern"
                    value={formData.billing_cycle}
                    onChange={(e) => setFormData((p) => ({ ...p, billing_cycle: e.target.value }))}
                    data-testid="select-offer-billing-cycle"
                  >
                    <option value="monthly">Mensal (a cada 30 dias)</option>
                    <option value="quarterly">Trimestral (a cada 90 dias)</option>
                    <option value="semiannual">Semestral (a cada 180 dias)</option>
                    <option value="annual">Anual (a cada 365 dias)</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="check-offer-default"
                checked={formData.is_default}
                onChange={(e) => setFormData((p) => ({ ...p, is_default: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
              />
              <label htmlFor="check-offer-default" style={{ fontSize: '13px', color: '#334155', cursor: 'pointer', margin: 0 }}>
                Tornar esta a oferta padrão principal do produto
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => setIsAdding(false)}
                data-testid="cancel-add-offer-btn"
              >
                <span>Cancelar</span>
              </button>
              <button
                type="submit"
                className="primary-action-btn"
                disabled={loading}
                data-testid="submit-new-offer-btn"
              >
                <Check size={14} />
                <span>Salvar Oferta</span>
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={onClose}
            data-testid="footer-close-offers-btn"
          >
            <span>Concluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
