import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  fetchProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  updateProductSplitRulesApi,
  fetchSplitRecipientsApi,
  createProductOfferApi,
  updateProductOfferApi,
  deleteProductOfferApi,
} from './productApi';

export function useProductManagement() {
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitProduct, setSplitProduct] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [selectedOffersProductId, setSelectedOffersProductId] = useState(null);

  const [copiedSlug, setCopiedSlug] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodsData, recsData] = await Promise.all([
        fetchProductsApi(),
        fetchSplitRecipientsApi(),
      ]);
      setProducts(prodsData || []);
      setRecipients(recsData || []);
    } catch (err) {
      addToast(
        err.message || err.response?.data?.detail || 'Erro ao carregar lista de produtos.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedOffersProduct = products.find((p) => p.id === selectedOffersProductId) || null;

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleOpenSplit = (product) => {
    setSplitProduct(product);
    setIsSplitModalOpen(true);
  };

  const handleOpenDelete = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleOpenOffers = (product) => {
    setSelectedOffersProductId(product.id);
    setIsOffersModalOpen(true);
  };

  const handleSaveProduct = async (payload) => {
    try {
      setActionLoading(true);
      if (selectedProduct) {
        await updateProductApi(selectedProduct.id, payload);
        addToast('Produto atualizado com sucesso!', 'success');
      } else {
        await createProductApi(payload);
        addToast('Produto criado com sucesso!', 'success');
      }
      setIsProductModalOpen(false);
      setSelectedProduct(null);
      await loadData();
    } catch (err) {
      addToast(
        err.message || err.response?.data?.detail || 'Erro ao salvar o produto.',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSplit = async (productId, rules) => {
    try {
      setActionLoading(true);
      await updateProductSplitRulesApi(productId, rules);
      addToast('Regras de split atualizadas com sucesso!', 'success');
      setIsSplitModalOpen(false);
      setSplitProduct(null);
      await loadData();
    } catch (err) {
      addToast(
        err.message || err.response?.data?.detail || 'Erro ao salvar regras de split.',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      setActionLoading(true);
      await deleteProductApi(productId);
      addToast('Produto excluído com sucesso!', 'success');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      await loadData();
    } catch (err) {
      addToast(
        err.message || err.response?.data?.detail || 'Erro ao excluir o produto.',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOffer = async (productId, payload) => {
    try {
      setActionLoading(true);
      await createProductOfferApi(productId, payload);
      addToast('Nova oferta cadastrada com sucesso!', 'success');
      await loadData();
    } catch (err) {
      addToast(
        err.message || err.response?.data?.detail || 'Erro ao criar oferta.',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOffer = async (productId, offerId, payload) => {
    try {
      setActionLoading(true);
      await updateProductOfferApi(productId, offerId, payload);
      addToast('Oferta atualizada com sucesso!', 'success');
      await loadData();
    } catch (err) {
      addToast(
        err.message || err.response?.data?.detail || 'Erro ao atualizar oferta.',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOffer = async (productId, offerId) => {
    try {
      setActionLoading(true);
      await deleteProductOfferApi(productId, offerId);
      addToast('Oferta excluída com sucesso!', 'success');
      await loadData();
    } catch (err) {
      addToast(
        err.message || err.response?.data?.detail || 'Erro ao excluir oferta.',
        'error'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = (slug) => {
    const fullUrl = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedSlug(slug);
      addToast('Link de checkout copiado para a área de transferência!', 'success');
      setTimeout(() => setCopiedSlug(null), 3000);
    });
  };

  return {
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
    refreshProducts: loadData,
  };
}
