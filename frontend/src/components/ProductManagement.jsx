import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, RefreshCw } from 'lucide-react';
import {
  useProductManagement,
  ProductsTable,
  ProductModal,
  ProductSplitModal,
  ConfirmDeleteProductModal,
  ProductOffersModal,
  ProductWebhooksModal,
  ProductPixelModal,
  ProductOrderBumpsModal,
  ProductUpsellModal,
  ProductAppearanceModal,
} from './product-management';

export default function ProductManagement({ currentUser }) {
  const {
    products,
    recipients,
    loading,
    actionLoading,
    isProductModalOpen,
    selectedProduct,
    isSplitModalOpen,
    splitProduct,
    isDeleteModalOpen,
    productToDelete,
    isOffersModalOpen,
    selectedOffersProduct,
    copiedSlug,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenSplit,
    handleOpenDelete,
    handleOpenOffers,
    handleSaveProduct,
    handleSaveSplit,
    handleDeleteProduct,
    handleCreateOffer,
    handleUpdateOffer,
    handleDeleteOffer,
    handleCopyLink,
    setIsProductModalOpen,
    setIsSplitModalOpen,
    setIsDeleteModalOpen,
    setIsOffersModalOpen,
    refreshProducts,
  } = useProductManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [isWebhooksModalOpen, setIsWebhooksModalOpen] = useState(false);
  const [selectedWebhooksProduct, setSelectedWebhooksProduct] = useState(null);

  const [isPixelModalOpen, setIsPixelModalOpen] = useState(false);
  const [selectedPixelProduct, setSelectedPixelProduct] = useState(null);

  const [isOrderBumpsModalOpen, setIsOrderBumpsModalOpen] = useState(false);
  const [selectedOrderBumpsProduct, setSelectedOrderBumpsProduct] = useState(null);

  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [selectedUpsellProduct, setSelectedUpsellProduct] = useState(null);

  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
  const [selectedAppearanceProduct, setSelectedAppearanceProduct] = useState(null);

  const [toastFeedback, setToastFeedback] = useState(null);

  const showFeedback = (type, message) => {
    setToastFeedback({ type, message });
    setTimeout(() => setToastFeedback(null), 4000);
  };

  const handleOpenWebhooks = (product) => {
    setSelectedWebhooksProduct(product);
    setIsWebhooksModalOpen(true);
  };

  const handleOpenPixel = (product) => {
    setSelectedPixelProduct(product);
    setIsPixelModalOpen(true);
  };

  const handleOpenOrderBumps = (product) => {
    setSelectedOrderBumpsProduct(product);
    setIsOrderBumpsModalOpen(true);
  };

  const handleOpenUpsell = (product) => {
    setSelectedUpsellProduct(product);
    setIsUpsellModalOpen(true);
  };

  const handleOpenAppearance = (product) => {
    setSelectedAppearanceProduct(product);
    setIsAppearanceModalOpen(true);
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.offers && p.offers.some((o) => o.name.toLowerCase().includes(term) || o.slug.toLowerCase().includes(term)))
    );
  }, [products, searchTerm]);

  return (
    <div className="product-management-container" data-testid="product-management-page">
      {/* Cabeçalho da Página */}
      <div className="product-header-box">
        <div>
          <h2 className="product-header-title">Produtos & Ofertas</h2>
          <p className="product-header-desc">
            Gerencie o catálogo de produtos, precificação múltipla e a divisão automática de pagamentos (Split)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="secondary-action-btn"
            onClick={refreshProducts}
            disabled={loading}
            title="Atualizar lista de produtos"
            data-testid="refresh-products-btn"
          >
            <RefreshCw size={16} className={loading ? 'spinning-icon' : ''} />
          </button>

          <button
            type="button"
            className="primary-action-btn"
            onClick={handleOpenCreate}
            data-testid="create-product-btn"
          >
            <Plus size={16} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="product-search-container">
        <Search size={18} className="product-search-icon" />
        <input
          type="text"
          className="product-search-input"
          placeholder="Buscar por nome, oferta ou slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="search-products-input"
        />
      </div>

      {/* Tabela de Produtos */}
      <ProductsTable
        products={filteredProducts}
        loading={loading}
        copiedSlug={copiedSlug}
        onCopyLink={handleCopyLink}
        onEdit={handleOpenEdit}
        onConfigureSplit={handleOpenSplit}
        onManageOffers={handleOpenOffers}
        onManageWebhooks={handleOpenWebhooks}
        onManagePixel={handleOpenPixel}
        onManageOrderBumps={handleOpenOrderBumps}
        onManageUpsell={handleOpenUpsell}
        onManageAppearance={handleOpenAppearance}
        onDelete={handleOpenDelete}
        onNewProduct={handleOpenCreate}
      />

      {/* Notificação Toast */}
      {toastFeedback && (
        <div
          data-testid="funnel-toast-feedback"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: toastFeedback.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {toastFeedback.message}
        </div>
      )}

      {/* Modal de Criação / Edição de Produto */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={selectedProduct}
        loading={actionLoading}
        onSave={handleSaveProduct}
        onCancel={() => setIsProductModalOpen(false)}
      />

      {/* Modal de Gerenciamento de Múltiplas Ofertas */}
      <ProductOffersModal
        isOpen={isOffersModalOpen}
        product={selectedOffersProduct}
        loading={actionLoading}
        copiedSlug={copiedSlug}
        onCopyLink={handleCopyLink}
        onCreateOffer={handleCreateOffer}
        onUpdateOffer={handleUpdateOffer}
        onDeleteOffer={handleDeleteOffer}
        onClose={() => setIsOffersModalOpen(false)}
      />

      {/* Modal de Webhooks de Saída */}
      <ProductWebhooksModal
        isOpen={isWebhooksModalOpen}
        product={selectedWebhooksProduct}
        onClose={() => setIsWebhooksModalOpen(false)}
      />

      {/* Modal de Configuração de Pixel do Meta */}
      <ProductPixelModal
        isOpen={isPixelModalOpen}
        product={selectedPixelProduct}
        onClose={() => {
          setIsPixelModalOpen(false);
          refreshProducts();
        }}
        showFeedback={showFeedback}
      />

      {/* Modal de Order Bumps */}
      <ProductOrderBumpsModal
        isOpen={isOrderBumpsModalOpen}
        product={selectedOrderBumpsProduct}
        onClose={() => {
          setIsOrderBumpsModalOpen(false);
          refreshProducts();
        }}
        showFeedback={showFeedback}
      />

      {/* Modal de UpSell Pós-Compra */}
      <ProductUpsellModal
        isOpen={isUpsellModalOpen}
        product={selectedUpsellProduct}
        onClose={() => {
          setIsUpsellModalOpen(false);
          refreshProducts();
        }}
        showFeedback={showFeedback}
      />

      {/* Modal de Identidade Visual / Aparência do Checkout */}
      <ProductAppearanceModal
        isOpen={isAppearanceModalOpen}
        product={selectedAppearanceProduct}
        onClose={() => {
          setIsAppearanceModalOpen(false);
          refreshProducts();
        }}
        showFeedback={showFeedback}
      />

      {/* Modal de Configuração de Split por Produto */}
      <ProductSplitModal
        isOpen={isSplitModalOpen}
        product={splitProduct}
        availableRecipients={recipients}
        loading={actionLoading}
        onSave={handleSaveSplit}
        onCancel={() => setIsSplitModalOpen(false)}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteProductModal
        isOpen={isDeleteModalOpen}
        product={productToDelete}
        loading={actionLoading}
        onConfirm={handleDeleteProduct}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
