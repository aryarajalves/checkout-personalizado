import React from 'react';
import './BuyerPortalAuth.css';
import './BuyerPortalDashboard.css';
import './BuyerPortalModals.css';
import { useToast } from '../../context/ToastContext';
import { useBuyerPortal } from './useBuyerPortal';
import BuyerAuthForm from './BuyerAuthForm';
import BuyerOrdersList from './BuyerOrdersList';
import BuyerSubscriptionsList from './BuyerSubscriptionsList';
import BuyerPixModal from './BuyerPixModal';
import BuyerCardUpdateModal from './BuyerCardUpdateModal';

export default function BuyerPortalPage() {
  const { addToast } = useToast();
  const {
    buyerUser,
    buyerToken,
    authStep,
    setAuthStep,
    inputEmail,
    setInputEmail,
    inputCpf,
    setInputCpf,
    inputCode,
    setInputCode,
    orders,
    subscriptions,
    activeTab,
    setActiveTab,
    loading,
    actionLoading,
    error,
    selectedPixOrder,
    setSelectedPixOrder,
    selectedSubForCard,
    setSelectedSubForCard,
    handleRequestCode,
    handleVerifyCode,
    handleLogout,
    handleRegeneratePix,
    handleUpdateCard,
  } = useBuyerPortal(addToast);

  // Se não estiver autenticado, exibe formulário de acesso seguro OTP
  if (!buyerToken || !buyerUser) {
    return (
      <div className="buyer-portal-wrapper">
        <header className="buyer-portal-navbar">
          <div className="buyer-navbar-brand">
            <span className="buyer-brand-icon">🎓</span>
            <span className="buyer-brand-title">Minhas Compras</span>
            <span className="buyer-brand-badge">Área do Aluno</span>
          </div>
        </header>

        <BuyerAuthForm
          authStep={authStep}
          setAuthStep={setAuthStep}
          inputEmail={inputEmail}
          setInputEmail={setInputEmail}
          inputCpf={inputCpf}
          setInputCpf={setInputCpf}
          inputCode={inputCode}
          setInputCode={setInputCode}
          handleRequestCode={handleRequestCode}
          handleVerifyCode={handleVerifyCode}
          loading={loading}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="buyer-portal-wrapper">
      <header className="buyer-portal-navbar">
        <div className="buyer-navbar-brand">
          <span className="buyer-brand-icon">🎓</span>
          <span className="buyer-brand-title">Minhas Compras</span>
          <span className="buyer-brand-badge">Área do Aluno</span>
        </div>

        <div className="buyer-navbar-user-actions">
          <div className="buyer-user-pill">
            <span>Olá, </span>
            <strong>{buyerUser.name}</strong>
          </div>
          <button type="button" className="buyer-btn-logout" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="buyer-portal-main">
        <nav className="buyer-tabs-nav" aria-label="Navegação da Central do Comprador">
          <button
            type="button"
            className={`buyer-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span>📦 Meus Pedidos & Cursos</span>
            <span className="tab-badge-count">{orders.length}</span>
          </button>

          <button
            type="button"
            className={`buyer-tab-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <span>🔁 Minhas Assinaturas</span>
            <span className="tab-badge-count">{subscriptions.length}</span>
          </button>
        </nav>

        {loading ? (
          <div className="buyer-empty-state">
            <span className="spinner-sm" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p className="buyer-empty-desc" style={{ marginTop: '1rem' }}>
              Carregando seus produtos e pedidos...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'orders' && (
              <BuyerOrdersList
                orders={orders}
                onOpenPix={(order) => setSelectedPixOrder(order)}
                onRegeneratePix={handleRegeneratePix}
                actionLoading={actionLoading}
              />
            )}

            {activeTab === 'subscriptions' && (
              <BuyerSubscriptionsList
                subscriptions={subscriptions}
                onOpenCardModal={(sub) => setSelectedSubForCard(sub)}
              />
            )}
          </>
        )}
      </main>

      {/* Modal de Pix */}
      {selectedPixOrder && (
        <BuyerPixModal
          order={selectedPixOrder}
          onClose={() => setSelectedPixOrder(null)}
          addToast={addToast}
        />
      )}

      {/* Modal de Atualização de Cartão */}
      {selectedSubForCard && (
        <BuyerCardUpdateModal
          subscription={selectedSubForCard}
          onClose={() => setSelectedSubForCard(null)}
          onUpdateCard={handleUpdateCard}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
