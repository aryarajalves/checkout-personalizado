import React, { useState, useEffect } from 'react';
import { Package, X, Check } from 'lucide-react';
import ProductPixelFields from './ProductPixelFields';
import ProductInstallmentFields from './ProductInstallmentFields';
import ProductRequirementFields from './ProductRequirementFields';
import ProductAsaasInstallmentFields from './ProductAsaasInstallmentFields';

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
    require_billing_address: false,
    meta_pixel_id: '',
    google_ads_id: '',
    google_ads_conversion_label: '',
    tiktok_pixel_id: '',
    thank_you_url: '',
    member_area_url: '',
    pix_discount_percent: '',
    crypto_discount_percent: '',
    max_installments: 12,
    free_installments_count: 1,
    interest_rate_percent: 2.99,
    interest_payer: 'buyer',
    enable_asaas_installments: false,
    asaas_max_installments: 12,
    asaas_interest_percent: 0,
    asaas_require_entry_pix: true,
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
        require_billing_address: product.require_billing_address !== undefined ? product.require_billing_address : false,
        meta_pixel_id: product.meta_pixel_id || '',
        google_ads_id: product.google_ads_id || '',
        google_ads_conversion_label: product.google_ads_conversion_label || '',
        tiktok_pixel_id: product.tiktok_pixel_id || '',
        thank_you_url: product.thank_you_url || '',
        member_area_url: product.member_area_url || '',
        pix_discount_percent: product.pix_discount_percent !== undefined && product.pix_discount_percent !== null ? product.pix_discount_percent : '',
        crypto_discount_percent: product.crypto_discount_percent !== undefined && product.crypto_discount_percent !== null ? product.crypto_discount_percent : '',
        max_installments: product.max_installments !== undefined ? product.max_installments : 12,
        free_installments_count: product.free_installments_count !== undefined ? product.free_installments_count : 1,
        interest_rate_percent: product.interest_rate_percent !== undefined ? product.interest_rate_percent : 2.99,
        interest_payer: product.interest_payer || 'buyer',
        enable_asaas_installments: product.enable_asaas_installments !== undefined ? product.enable_asaas_installments : false,
        asaas_max_installments: product.asaas_max_installments !== undefined ? product.asaas_max_installments : 12,
        asaas_interest_percent: product.asaas_interest_percent !== undefined ? product.asaas_interest_percent : 0,
        asaas_require_entry_pix: product.asaas_require_entry_pix !== undefined ? product.asaas_require_entry_pix : true,
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
        google_ads_id: '',
        google_ads_conversion_label: '',
        tiktok_pixel_id: '',
        thank_you_url: '',
        member_area_url: '',
        pix_discount_percent: '',
        crypto_discount_percent: '',
        max_installments: 12,
        free_installments_count: 1,
        interest_rate_percent: 2.99,
        interest_payer: 'buyer',
        enable_asaas_installments: false,
        asaas_max_installments: 12,
        asaas_interest_percent: 0,
        asaas_require_entry_pix: true,
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

  const handleDiscountChange = (field, val) => {
    if (val === '') {
      setFormData((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    setFormData((prev) => ({ ...prev, [field]: num }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'O nome do produto é obrigatório.';
    if (!formData.slug.trim()) newErrors.slug = 'O slug da URL é obrigatório.';
    if (formData.price_brl === '' || Number(formData.price_brl) < 0) {
      newErrors.price_brl = 'Informe um preço válido em BRL (mínimo R$ 0,00).';
    }
    if (formData.pix_discount_percent !== '' && (Number(formData.pix_discount_percent) < 0 || Number(formData.pix_discount_percent) > 100)) {
      newErrors.pix_discount_percent = 'O desconto Pix deve ser entre 0% e 100%.';
    }
    if (formData.crypto_discount_percent !== '' && (Number(formData.crypto_discount_percent) < 0 || Number(formData.crypto_discount_percent) > 100)) {
      newErrors.crypto_discount_percent = 'O desconto Cripto deve ser entre 0% e 100%.';
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
      google_ads_id: formData.google_ads_id ? formData.google_ads_id.trim() : null,
      google_ads_conversion_label: formData.google_ads_conversion_label ? formData.google_ads_conversion_label.trim() : null,
      tiktok_pixel_id: formData.tiktok_pixel_id ? formData.tiktok_pixel_id.trim() : null,
      thank_you_url: formData.thank_you_url ? formData.thank_you_url.trim() : null,
      member_area_url: formData.member_area_url ? formData.member_area_url.trim() : null,
      pix_discount_percent: formData.pix_discount_percent !== '' ? parseFloat(formData.pix_discount_percent) : 0.0,
      crypto_discount_percent: formData.crypto_discount_percent !== '' ? parseFloat(formData.crypto_discount_percent) : 0.0,
      max_installments: parseInt(formData.max_installments || 12, 10),
      free_installments_count: parseInt(formData.free_installments_count || 1, 10),
      interest_rate_percent: formData.interest_rate_percent !== '' ? parseFloat(formData.interest_rate_percent) : 2.99,
      interest_payer: formData.interest_payer || 'buyer',
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
        <form onSubmit={handleSubmit} noValidate>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Desconto Pix (%)</label>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                  {formData.pix_discount_percent !== '' ? `${formData.pix_discount_percent}%` : '0%'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.pix_discount_percent || 0}
                  onChange={(e) => handleDiscountChange('pix_discount_percent', e.target.value)}
                  data-testid="slider-product-pix-discount"
                  style={{ flex: 1, accentColor: '#0284c7', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="form-control-modern"
                  placeholder="0"
                  value={formData.pix_discount_percent}
                  onChange={(e) => handleDiscountChange('pix_discount_percent', e.target.value)}
                  data-testid="input-product-pix-discount"
                  style={{ width: '75px', textAlign: 'center' }}
                />
              </div>
              <span style={{ color: '#64748b', fontSize: '11.5px', marginTop: '3px', display: 'block' }}>
                Desconto à vista no Pix (0 a 100%).
              </span>
              {errors.pix_discount_percent && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{errors.pix_discount_percent}</span>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Desconto Cripto (%)</label>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                  {formData.crypto_discount_percent !== '' ? `${formData.crypto_discount_percent}%` : '0%'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.crypto_discount_percent || 0}
                  onChange={(e) => handleDiscountChange('crypto_discount_percent', e.target.value)}
                  data-testid="slider-product-crypto-discount"
                  style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="form-control-modern"
                  placeholder="0"
                  value={formData.crypto_discount_percent}
                  onChange={(e) => handleDiscountChange('crypto_discount_percent', e.target.value)}
                  data-testid="input-product-crypto-discount"
                  style={{ width: '75px', textAlign: 'center' }}
                />
              </div>
              <span style={{ color: '#64748b', fontSize: '11.5px', marginTop: '3px', display: 'block' }}>
                Desconto em Cripto (0 a 100%).
              </span>
              {errors.crypto_discount_percent && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{errors.crypto_discount_percent}</span>}
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

          <ProductPixelFields formData={formData} setFormData={setFormData} />

          <ProductInstallmentFields formData={formData} setFormData={setFormData} />

          <ProductAsaasInstallmentFields formData={formData} setFormData={setFormData} />

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

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>URL da Área de Membros / Entrega do Curso (Opcional)</label>
            <input
              type="url"
              className="form-control-modern"
              placeholder="https://membros.meudominio.com.br/curso"
              value={formData.member_area_url}
              onChange={(e) => setFormData((p) => ({ ...p, member_area_url: e.target.value }))}
              data-testid="input-product-member-area-url"
            />
            <span style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Link de acesso ao conteúdo liberado para o aluno na Central do Comprador e na página de obrigado após o pagamento.
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

          <ProductRequirementFields formData={formData} setFormData={setFormData} />

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
