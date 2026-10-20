import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowDownRight, X, Check, Trash2 } from 'lucide-react';
import {
  fetchProductUpsellsApi,
  createProductUpsellApi,
  updateProductUpsellApi,
  deleteProductUpsellApi,
  fetchProductsApi,
  fetchProductOffersApi,
} from './productApi';
import ProductUpsellForm from './ProductUpsellForm';
import ProductDownsellForm from './ProductDownsellForm';

export function ProductUpsellModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [activeTab, setActiveTab] = useState('upsell'); // 'upsell' | 'downsell'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [upsellId, setUpsellId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [catalogProducts, setCatalogProducts] = useState([]);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [availableDownsellOffers, setAvailableDownsellOffers] = useState([]);
  const [loadingDownsellOffers, setLoadingDownsellOffers] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    price_brl: '',
    video_url: '',
    image_url: '',
    external_url: '',
    is_active: true,
    upsell_product_id: '',
    upsell_offer_id: '',
    enable_downsell: false,
    downsell_product_id: '',
    downsell_offer_id: '',
    downsell_title: '',
    downsell_subtitle: '',
    downsell_description: '',
    downsell_price_brl: '',
    downsell_image_url: '',
    downsell_video_url: '',
    downsell_external_url: '',
  });

  useEffect(() => {
    if (!isOpen || !product) return;
    loadUpsell();
    loadCatalog();
  }, [isOpen, product]);

  const loadCatalog = async () => {
    try {
      const data = await fetchProductsApi();
      const filtered = Array.isArray(data) ? data.filter((p) => p.id !== product.id) : [];
      setCatalogProducts(filtered);
    } catch (err) {
      console.error('Erro ao carregar catálogo para upsell:', err);
    }
  };

  const loadUpsell = async () => {
    try {
      setLoading(true);
      const list = await fetchProductUpsellsApi(product.id);
      if (list && list.length > 0) {
        const u = list[0];
        setUpsellId(u.id);
        setFormData({
          title: u.title || '',
          subtitle: u.subtitle || '',
          description: u.description || '',
          price_brl: String(u.price_brl),
          video_url: u.video_url || '',
          image_url: u.image_url || '',
          external_url: u.external_url || '',
          is_active: u.is_active,
          upsell_product_id: u.upsell_product_id ? String(u.upsell_product_id) : '',
          upsell_offer_id: u.upsell_offer_id ? String(u.upsell_offer_id) : '',
          enable_downsell: Boolean(u.enable_downsell),
          downsell_product_id: u.downsell_product_id ? String(u.downsell_product_id) : '',
          downsell_offer_id: u.downsell_offer_id ? String(u.downsell_offer_id) : '',
          downsell_title: u.downsell_title || '',
          downsell_subtitle: u.downsell_subtitle || '',
          downsell_description: u.downsell_description || '',
          downsell_price_brl: u.downsell_price_brl ? String(u.downsell_price_brl) : '',
          downsell_image_url: u.downsell_image_url || '',
          downsell_video_url: u.downsell_video_url || '',
          downsell_external_url: u.downsell_external_url || '',
        });

        if (u.upsell_product_id) {
          fetchOffers(u.upsell_product_id, setAvailableOffers, setLoadingOffers);
        }
        if (u.downsell_product_id) {
          fetchOffers(u.downsell_product_id, setAvailableDownsellOffers, setLoadingDownsellOffers);
        }
      } else {
        setUpsellId(null);
        setFormData({
          title: 'Espere! Oferta Especial e Única para Você',
          subtitle: 'Aproveite esta oportunidade única para acelerar seus resultados',
          description: 'Acesso imediato ao nosso conteúdo avançado e exclusivo com desconto especial somente nesta página.',
          price_brl: '97.00',
          video_url: '',
          image_url: '',
          external_url: '',
          is_active: true,
          upsell_product_id: '',
          upsell_offer_id: '',
          enable_downsell: false,
          downsell_product_id: '',
          downsell_offer_id: '',
          downsell_title: 'Espere! Leve esta oportunidade imperdível',
          downsell_subtitle: 'Condição super exclusiva antes de finalizar',
          downsell_description: 'Versão essencial com preço ainda mais acessível.',
          downsell_price_brl: '47.00',
          downsell_image_url: '',
          downsell_video_url: '',
          downsell_external_url: '',
        });
        setAvailableOffers([]);
        setAvailableDownsellOffers([]);
      }
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar UpSell.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async (prodId, setOffers, setLoading) => {
    try {
      setLoading(true);
      const offers = await fetchProductOffersApi(prodId);
      setOffers(offers || []);
    } catch (err) {
      console.error('Erro ao carregar ofertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (selectedProdId) => {
    if (!selectedProdId) {
      setFormData((prev) => ({ ...prev, upsell_product_id: '', upsell_offer_id: '' }));
      setAvailableOffers([]);
      return;
    }
    const found = catalogProducts.find((p) => String(p.id) === String(selectedProdId));
    setFormData((prev) => ({
      ...prev,
      upsell_product_id: String(selectedProdId),
      upsell_offer_id: '',
      price_brl: found?.price_brl ? String(found.price_brl) : prev.price_brl,
    }));
    fetchOffers(selectedProdId, setAvailableOffers, setLoadingOffers);
  };

  const handleDownsellProductChange = (selectedProdId) => {
    if (!selectedProdId) {
      setFormData((prev) => ({ ...prev, downsell_product_id: '', downsell_offer_id: '' }));
      setAvailableDownsellOffers([]);
      return;
    }
    const found = catalogProducts.find((p) => String(p.id) === String(selectedProdId));
    setFormData((prev) => ({
      ...prev,
      downsell_product_id: String(selectedProdId),
      downsell_offer_id: '',
      downsell_price_brl: found?.price_brl ? String(found.price_brl) : prev.downsell_price_brl,
    }));
    fetchOffers(selectedProdId, setAvailableDownsellOffers, setLoadingDownsellOffers);
  };

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showFeedback('error', 'O título da oferta de UpSell é obrigatório.');
      return;
    }
    const price = parseFloat(formData.price_brl);
    if (isNaN(price) || price <= 0) {
      showFeedback('error', 'Informe um preço válido maior que zero para o UpSell.');
      return;
    }

    let dwPrice = null;
    if (formData.enable_downsell) {
      dwPrice = parseFloat(formData.downsell_price_brl);
      if (isNaN(dwPrice) || dwPrice <= 0) {
        showFeedback('error', 'Informe um preço válido maior que zero para o Downsell.');
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        description: formData.description.trim() || null,
        price_brl: price,
        video_url: formData.video_url.trim() || null,
        image_url: formData.image_url.trim() || null,
        external_url: formData.external_url.trim() || null,
        is_active: formData.is_active,
        upsell_product_id: formData.upsell_product_id ? parseInt(formData.upsell_product_id, 10) : null,
        upsell_offer_id: formData.upsell_offer_id ? parseInt(formData.upsell_offer_id, 10) : null,
        enable_downsell: Boolean(formData.enable_downsell),
        downsell_product_id: formData.downsell_product_id ? parseInt(formData.downsell_product_id, 10) : null,
        downsell_offer_id: formData.downsell_offer_id ? parseInt(formData.downsell_offer_id, 10) : null,
        downsell_title: formData.downsell_title.trim() || null,
        downsell_subtitle: formData.downsell_subtitle.trim() || null,
        downsell_description: formData.downsell_description.trim() || null,
        downsell_price_brl: dwPrice,
        downsell_image_url: formData.downsell_image_url.trim() || null,
        downsell_video_url: formData.downsell_video_url.trim() || null,
        downsell_external_url: formData.downsell_external_url.trim() || null,
      };

      if (upsellId) {
        await updateProductUpsellApi(product.id, upsellId, payload);
        showFeedback('success', 'Oferta de UpSell/Downsell atualizada com sucesso!');
      } else {
        const res = await createProductUpsellApi(product.id, payload);
        setUpsellId(res.id);
        showFeedback('success', 'Oferta de UpSell/Downsell criada com sucesso!');
      }
      onClose();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar oferta de UpSell/Downsell.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!upsellId) return;
    try {
      setSaving(true);
      await deleteProductUpsellApi(product.id, upsellId);
      showFeedback('success', 'UpSell removido com sucesso!');
      setUpsellId(null);
      setShowDeleteConfirm(false);
      loadUpsell();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao excluir UpSell.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="webhooks-modal-overlay" data-testid="product-upsell-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="webhooks-modal-dialog" role="dialog" aria-modal="true" data-testid="product-upsell-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-header-title-box">
            <div className="webhooks-header-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 className="webhooks-header-title">Funil de UpSell & Downsell Pós-Compra</h3>
              <p className="webhooks-header-subtitle">
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button type="button" className="webhooks-close-btn" onClick={onClose} disabled={saving} data-testid="close-upsell-modal-btn">
            <X size={18} />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('upsell')}
            data-testid="tab-upsell"
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: activeTab === 'upsell' ? '2px solid #d97706' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'upsell' ? '#d97706' : '#64748b',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <TrendingUp size={16} />
            <span>1. Oferta de UpSell</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('downsell')}
            data-testid="tab-downsell"
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: activeTab === 'downsell' ? '2px solid #16a34a' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'downsell' ? '#16a34a' : '#64748b',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowDownRight size={16} />
            <span>2. Oferta de Downsell {formData.enable_downsell && '✓'}</span>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <div className="spinning-icon" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #fef3c7', borderTopColor: '#d97706', borderRadius: '50%' }} />
              <p style={{ marginTop: '12px', fontSize: '13px' }}>Carregando configurações...</p>
            </div>
          ) : (
            <>
              {activeTab === 'upsell' ? (
                <ProductUpsellForm
                  formData={formData}
                  setFormData={setFormData}
                  catalogProducts={catalogProducts}
                  availableOffers={availableOffers}
                  loadingOffers={loadingOffers}
                  onProductChange={handleProductChange}
                />
              ) : (
                <ProductDownsellForm
                  formData={formData}
                  setFormData={setFormData}
                  catalogProducts={catalogProducts}
                  availableDownsellOffers={availableDownsellOffers}
                  loadingDownsellOffers={loadingDownsellOffers}
                  onDownsellProductChange={handleDownsellProductChange}
                />
              )}

              {/* Botões de Ação */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9', marginTop: '12px' }}>
                <div>
                  {upsellId && (
                    <button type="button" className="webhooks-btn-danger" onClick={() => setShowDeleteConfirm(true)} disabled={saving} style={{ padding: '6px 12px', fontSize: '12px' }} data-testid="btn-delete-upsell">
                      <Trash2 size={13} />
                      <span>Excluir Funil</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="webhooks-btn-secondary" onClick={onClose} disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="webhooks-btn-primary" style={{ backgroundColor: '#d97706', borderColor: '#b45309' }} disabled={saving} data-testid="btn-save-upsell">
                    <Check size={14} />
                    <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="webhooks-modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(0, 0, 0, 0.75)' }} onClick={(e) => e.stopPropagation()} data-testid="upsell-delete-confirm-overlay">
          <div className="webhooks-modal-dialog" role="dialog" aria-modal="true" data-testid="upsell-delete-confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Excluir Oferta de UpSell/Downsell?
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
              Esta ação removerá permanentemente a oferta de UpSell e eventuais Downsells vinculados a este produto.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button type="button" className="webhooks-btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving} data-testid="btn-cancel-delete-upsell">
                Cancelar
              </button>
              <button type="button" className="webhooks-btn-danger" onClick={handleDelete} disabled={saving} data-testid="btn-confirm-delete-upsell">
                {saving ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ProductUpsellModal;
