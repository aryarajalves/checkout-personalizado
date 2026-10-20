import React, { useState, useEffect } from 'react';
import { Sparkles, X, Plus, Edit2, Trash2 } from 'lucide-react';
import {
  fetchProductOrderBumpsApi,
  createProductOrderBumpApi,
  updateProductOrderBumpApi,
  deleteProductOrderBumpApi,
  fetchProductsApi,
  fetchProductOffersApi,
} from './productApi';
import ConfirmDeleteBumpModal from './ConfirmDeleteBumpModal';
import ProductOrderBumpForm from './ProductOrderBumpForm';

export function ProductOrderBumpsModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [bumps, setBumps] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [availableOffers, setAvailableOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBumpId, setEditingBumpId] = useState(null);

  const [formData, setFormData] = useState({
    bump_product_id: '',
    bump_offer_id: '',
    title: '',
    description: '',
    price_brl: '',
    is_active: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, bump: null });

  useEffect(() => {
    if (!isOpen || !product) return;
    loadBumps();
    loadCatalogProducts();
  }, [isOpen, product]);

  const loadBumps = async () => {
    try {
      setLoading(true);
      const data = await fetchProductOrderBumpsApi(product.id);
      setBumps(data);
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao carregar order bumps.');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogProducts = async () => {
    try {
      const data = await fetchProductsApi();
      const filtered = Array.isArray(data) ? data.filter((p) => p.id !== product.id) : [];
      setCatalogProducts(filtered);
    } catch (err) {
      console.error('Erro ao carregar catálogo para bumps:', err);
    }
  };

  if (!isOpen || !product) return null;

  const handleStartAdd = () => {
    setIsEditing(true);
    setEditingBumpId(null);
    setAvailableOffers([]);
    setFormData({
      bump_product_id: '',
      bump_offer_id: '',
      title: '',
      description: '',
      price_brl: '',
      is_active: true,
    });
  };

  const handleStartEdit = async (bump) => {
    setIsEditing(true);
    setEditingBumpId(bump.id);
    setFormData({
      bump_product_id: bump.bump_product_id ? String(bump.bump_product_id) : '',
      bump_offer_id: bump.bump_offer_id ? String(bump.bump_offer_id) : '',
      title: bump.title,
      description: bump.description || '',
      price_brl: String(bump.price_brl),
      is_active: bump.is_active,
    });

    if (bump.bump_product_id) {
      try {
        setLoadingOffers(true);
        const offers = await fetchProductOffersApi(bump.bump_product_id);
        setAvailableOffers(offers || []);
      } catch (err) {
        console.error('Erro ao carregar ofertas do bump:', err);
      } finally {
        setLoadingOffers(false);
      }
    } else {
      setAvailableOffers([]);
    }
  };

  const handleProductChange = async (selectedProdId) => {
    if (!selectedProdId) {
      setFormData((prev) => ({
        ...prev,
        bump_product_id: '',
        bump_offer_id: '',
      }));
      setAvailableOffers([]);
      return;
    }

    const prod = catalogProducts.find((p) => String(p.id) === String(selectedProdId));
    if (!prod) return;

    try {
      setLoadingOffers(true);
      const offers = await fetchProductOffersApi(prod.id);
      setAvailableOffers(offers || []);

      let selectedOfferId = '';
      let initialPrice = prod.price_brl;

      if (offers && offers.length > 0) {
        const defaultOffer = offers.find((o) => o.is_default) || offers[0];
        selectedOfferId = String(defaultOffer.id);
        initialPrice = defaultOffer.price_brl;
      }

      setFormData((prev) => ({
        ...prev,
        bump_product_id: String(prod.id),
        bump_offer_id: selectedOfferId,
        title: prod.name,
        price_brl: String(initialPrice),
      }));
    } catch (err) {
      console.error('Erro ao carregar ofertas:', err);
      setFormData((prev) => ({
        ...prev,
        bump_product_id: String(prod.id),
        bump_offer_id: '',
        title: prod.name,
        price_brl: String(prod.price_brl),
      }));
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleOfferChange = (selectedOfferId) => {
    const offer = availableOffers.find((o) => String(o.id) === String(selectedOfferId));
    if (offer) {
      setFormData((prev) => ({
        ...prev,
        bump_offer_id: String(offer.id),
        price_brl: String(offer.price_brl),
      }));
    }
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingBumpId(null);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showFeedback('error', 'O título da oferta de order bump é obrigatório.');
      return;
    }
    const price = parseFloat(formData.price_brl);
    if (isNaN(price) || price < 0) {
      showFeedback('error', 'Informe um preço válido para o order bump.');
      return;
    }

    try {
      setActionLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price_brl: price,
        is_active: formData.is_active,
        bump_product_id: formData.bump_product_id ? parseInt(formData.bump_product_id, 10) : null,
        bump_offer_id: formData.bump_offer_id ? parseInt(formData.bump_offer_id, 10) : null,
      };

      if (editingBumpId) {
        await updateProductOrderBumpApi(product.id, editingBumpId, payload);
        showFeedback('success', 'Order bump atualizado com sucesso!');
      } else {
        await createProductOrderBumpApi(product.id, payload);
        showFeedback('success', 'Novo order bump adicionado com sucesso!');
      }

      handleCancelForm();
      loadBumps();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar order bump.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm.bump) return;
    try {
      setActionLoading(true);
      await deleteProductOrderBumpApi(product.id, deleteConfirm.bump.id);
      showFeedback('success', 'Order bump removido com sucesso!');
      setDeleteConfirm({ isOpen: false, bump: null });
      loadBumps();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao remover order bump.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-order-bumps-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-order-bumps-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-header-title-box">
            <div className="webhooks-header-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="webhooks-header-title">Order Bumps no Checkout</h3>
              <p className="webhooks-header-subtitle">
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onClose}
            data-testid="close-order-bumps-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Ofertas complementares de 1-clique exibidas diretamente no checkout.
            </span>
            {!isEditing && (
              <button
                type="button"
                className="webhooks-btn-primary"
                style={{ backgroundColor: '#059669', borderColor: '#047857', padding: '6px 12px', fontSize: '12.5px' }}
                onClick={handleStartAdd}
                data-testid="btn-add-order-bump"
              >
                <Plus size={14} />
                <span>Novo Bump</span>
              </button>
            )}
          </div>

          {/* Formulário Modularizado de Criação/Edição */}
          {isEditing && (
            <ProductOrderBumpForm
              editingBumpId={editingBumpId}
              formData={formData}
              setFormData={setFormData}
              catalogProducts={catalogProducts}
              availableOffers={availableOffers}
              loadingOffers={loadingOffers}
              actionLoading={actionLoading}
              onProductChange={handleProductChange}
              onOfferChange={handleOfferChange}
              onSave={handleSaveForm}
              onCancel={handleCancelForm}
            />
          )}

          {/* Listagem de Bumps */}
          {loading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b' }}>
              <div className="spinning-icon" style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #ecfdf5', borderTopColor: '#059669', borderRadius: '50%' }} />
              <p style={{ marginTop: '8px', fontSize: '12.5px' }}>Carregando bumps...</p>
            </div>
          ) : bumps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <Sparkles size={24} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Nenhum Order Bump configurado</p>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Adicione produtos complementares para aumentar o ticket médio das suas vendas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bumps.map((b) => (
                <div
                  key={b.id}
                  data-testid={`bump-card-${b.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: `1px solid ${b.is_active ? '#a7f3d0' : '#e2e8f0'}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{b.title}</span>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, backgroundColor: b.is_active ? '#ecfdf5' : '#f1f5f9', color: b.is_active ? '#059669' : '#64748b' }}>
                        {b.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                      {b.bump_product_name && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                          Produto: {b.bump_product_name} {b.bump_offer_name ? `(${b.bump_offer_name})` : ''}
                        </span>
                      )}
                    </div>
                    {b.description && (
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>{b.description}</p>
                    )}
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                      + R$ {Number(b.price_brl).toFixed(2).replace('.', ',')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="webhooks-btn-secondary"
                      onClick={() => handleStartEdit(b)}
                      style={{ padding: '5px 8px', fontSize: '12px' }}
                      title="Editar bump"
                      data-testid={`btn-edit-bump-${b.id}`}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="webhooks-btn-danger"
                      onClick={() => setDeleteConfirm({ isOpen: true, bump: b })}
                      style={{ padding: '5px 8px', fontSize: '12px', color: '#dc2626' }}
                      title="Excluir bump"
                      data-testid={`btn-delete-bump-${b.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="webhooks-btn-secondary"
              onClick={onClose}
              data-testid="footer-close-order-bumps-btn"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Modal de confirmação de exclusão extraído */}
        <ConfirmDeleteBumpModal
          isOpen={deleteConfirm.isOpen}
          bump={deleteConfirm.bump}
          onClose={() => setDeleteConfirm({ isOpen: false, bump: null })}
          onConfirm={handleExecuteDelete}
          loading={actionLoading}
        />
      </div>
    </div>
  );
}

export default ProductOrderBumpsModal;
