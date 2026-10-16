import React from 'react';
import { CreditCard, Share2 } from 'lucide-react';
import {
  GatewayCards,
  SplitRecipientsTable,
  RecipientModal,
  ConfirmDeleteRecipientModal,
  useGatewayManagement,
} from './gateway-management';

export default function GatewayManagement({ currentUser }) {
  const {
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
  } = useGatewayManagement();

  return (
    <div className="gateway-management-container" data-testid="gateway-management-page">
      {/* Header */}
      <div className="content-header">
        <div className="header-title-box">
          <h2>Gateways & Split de Pagamento</h2>
          <p className="header-subtitle">
            Configure as credenciais dos processadores (Pagar.me e NOWPayments) e gerencie os recebedores de divisão de vendas.
          </p>
        </div>
      </div>

      {/* Subtabs de Navegação (Design System) */}
      <div className="sub-tabs-container">
        <button
          type="button"
          className={`sub-tab-btn ${activeSubTab === 'gateways' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('gateways')}
          data-testid="subtab-gateways"
        >
          <CreditCard size={16} />
          <span>Gateways de Pagamento</span>
        </button>
        <button
          type="button"
          className={`sub-tab-btn ${activeSubTab === 'split' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('split')}
          data-testid="subtab-split"
        >
          <Share2 size={16} />
          <span>Recebedores do Split</span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: activeSubTab === 'split' ? '#bae6fd' : '#e2e8f0',
              color: activeSubTab === 'split' ? '#0369a1' : '#475569',
              fontWeight: 700,
              marginLeft: '4px',
            }}
          >
            {recipients.length}
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {activeSubTab === 'gateways' && (
        <GatewayCards
          gateways={gateways}
          loading={loadingGateways}
          testingGateway={testingGateway}
          savingGateway={savingGateway}
          onTestConnection={handleTestConnection}
          onSaveGateway={handleSaveGateway}
        />
      )}

      {activeSubTab === 'split' && (
        <SplitRecipientsTable
          recipients={recipients}
          loading={loadingRecipients}
          onOpenCreate={handleOpenCreateRecipient}
          onOpenEdit={handleOpenEditRecipient}
          onPromptDelete={handlePromptDeleteRecipient}
        />
      )}

      {/* Modais de Cadastro/Edição e Confirmação de Deleção */}
      <RecipientModal
        isOpen={recipientModalOpen}
        onClose={() => setRecipientModalOpen(false)}
        onSave={handleSaveRecipient}
        recipient={editingRecipient}
        loading={savingRecipient}
      />

      <ConfirmDeleteRecipientModal
        isOpen={deleteModal.isOpen}
        title="Excluir Recebedor do Split"
        message={
          deleteModal.recipient
            ? `Deseja realmente remover o recebedor "${deleteModal.recipient.name}" do split de pagamentos? Esta ação não pode ser desfeita.`
            : ''
        }
        loading={deleteModal.loading}
        onConfirm={handleConfirmDeleteRecipient}
        onClose={() => setDeleteModal({ isOpen: false, recipient: null, loading: false })}
      />
    </div>
  );
}
