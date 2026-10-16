import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  fetchGatewaysApi,
  saveGatewayApi,
  testGatewayConnectionApi,
  fetchSplitRecipientsApi,
  createSplitRecipientApi,
  updateSplitRecipientApi,
  deleteSplitRecipientApi,
} from './gatewayApi';

export function useGatewayManagement() {
  const { addToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState(() => {
    return localStorage.getItem('active_subtab_gateways') || 'gateways';
  });

  const handleSelectSubTab = (tab) => {
    setActiveSubTab(tab);
    localStorage.setItem('active_subtab_gateways', tab);
  };

  // Estado dos Gateways
  const [gateways, setGateways] = useState([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [testingGateway, setTestingGateway] = useState(null);
  const [savingGateway, setSavingGateway] = useState(null);

  // Estado dos Recebedores de Split
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [savingRecipient, setSavingRecipient] = useState(false);

  // Modal de Exclusão
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    recipient: null,
    loading: false,
  });

  // Carregar Gateways
  const loadGateways = useCallback(async () => {
    setLoadingGateways(true);
    try {
      const data = await fetchGatewaysApi();
      setGateways(data);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar gateways.', 'error');
    } finally {
      setLoadingGateways(false);
    }
  }, [addToast]);

  // Carregar Recebedores
  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const data = await fetchSplitRecipientsApi();
      setRecipients(data);
    } catch (err) {
      addToast(err.message || 'Erro ao carregar recebedores de split.', 'error');
    } finally {
      setLoadingRecipients(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadGateways();
    loadRecipients();
  }, [loadGateways, loadRecipients]);

  // Salvar Gateway
  const handleSaveGateway = async (gatewayPayload) => {
    setSavingGateway(gatewayPayload.gateway_name);
    try {
      const updated = await saveGatewayApi(gatewayPayload);
      setGateways((prev) =>
        prev.map((g) => (g.gateway_name === updated.gateway_name ? updated : g))
      );
      addToast(`Configurações de ${updated.gateway_name.toUpperCase()} salvas com sucesso!`, 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao salvar gateway.', 'error');
    } finally {
      setSavingGateway(null);
    }
  };

  // Testar Conexão do Gateway
  const handleTestConnection = async (testPayload) => {
    setTestingGateway(testPayload.gateway_name);
    try {
      const result = await testGatewayConnectionApi(testPayload);
      if (result.success) {
        addToast(result.message, 'success');
      } else {
        addToast(result.message, 'error');
      }
    } catch (err) {
      addToast(err.message || 'Falha ao testar conexão com gateway.', 'error');
    } finally {
      setTestingGateway(null);
    }
  };

  // Abrir Modal de Criação de Recebedor
  const handleOpenCreateRecipient = () => {
    setEditingRecipient(null);
    setRecipientModalOpen(true);
  };

  // Abrir Modal de Edição de Recebedor
  const handleOpenEditRecipient = (recipient) => {
    setEditingRecipient(recipient);
    setRecipientModalOpen(true);
  };

  // Salvar (Criar ou Atualizar) Recebedor
  const handleSaveRecipient = async (formData) => {
    setSavingRecipient(true);
    try {
      if (editingRecipient) {
        const updated = await updateSplitRecipientApi(editingRecipient.id, formData);
        setRecipients((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        addToast(`Recebedor "${updated.name}" atualizado com sucesso!`, 'success');
      } else {
        const created = await createSplitRecipientApi(formData);
        setRecipients((prev) => [...prev, created]);
        addToast(`Recebedor "${created.name}" cadastrado com sucesso!`, 'success');
      }
      setRecipientModalOpen(false);
      setEditingRecipient(null);
    } catch (err) {
      addToast(err.message || 'Erro ao salvar recebedor.', 'error');
    } finally {
      setSavingRecipient(false);
    }
  };

  // Abrir Modal de Exclusão
  const handlePromptDeleteRecipient = (recipient) => {
    setDeleteModal({
      isOpen: true,
      recipient,
      loading: false,
    });
  };

  // Confirmar Exclusão
  const handleConfirmDeleteRecipient = async () => {
    if (!deleteModal.recipient) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await deleteSplitRecipientApi(deleteModal.recipient.id);
      setRecipients((prev) => prev.filter((r) => r.id !== deleteModal.recipient.id));
      addToast(`Recebedor "${deleteModal.recipient.name}" excluído com sucesso.`, 'success');
      setDeleteModal({ isOpen: false, recipient: null, loading: false });
    } catch (err) {
      addToast(err.message || 'Erro ao excluir recebedor.', 'error');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return {
    activeSubTab,
    handleSelectSubTab,
    gateways,
    loadingGateways,
    testingGateway,
    savingGateway,
    handleSaveGateway,
    handleTestConnection,
    recipients,
    loadingRecipients,
    recipientModalOpen,
    setRecipientModalOpen,
    editingRecipient,
    savingRecipient,
    handleOpenCreateRecipient,
    handleOpenEditRecipient,
    handleSaveRecipient,
    deleteModal,
    setDeleteModal,
    handlePromptDeleteRecipient,
    handleConfirmDeleteRecipient,
  };
}
