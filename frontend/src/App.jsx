import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import SalesManagement from './components/SalesManagement';
import ProductsHub from './components/products/ProductsHub';
import FinanceHub from './components/finance/FinanceHub';
import SystemHub from './components/system/SystemHub';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import CheckoutPage from './components/checkout/CheckoutPage';
import CheckoutUpsellPage from './components/checkout/CheckoutUpsellPage';
import CheckoutThankYouPage from './components/checkout/CheckoutThankYouPage';
import CustomDomainResolver from './components/checkout/CustomDomainResolver';
import { BuyerPortalPage } from './components/buyer-portal';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import { UserSettingsModal } from './components/user-settings';
import { useToast } from './context/ToastContext';
import { AUTH_EXPIRED_EVENT } from './services/authInterceptor';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('active_tab') || 'users';
  });

  const [pathname, setPathname] = useState(window.location.pathname);
  const { addToast } = useToast();

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('active_tab', tabId);
  };

  useEffect(() => {
    // Check local storage for existing session
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // ignore error
      }
    }

    // Ouvinte para logout automático quando o token expirar
    const handleExpired = () => {
      setUser(null);
      setToken(null);
      setShowLogoutModal(false);
      addToast('Sua sessão expirou. Por favor, faça login novamente.', 'error');
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    };
  }, [addToast]);

  const handleLoginSuccess = (loggedInUser, userToken) => {
    setUser(loggedInUser);
    setToken(userToken);
  };

  const handlePromptLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('active_tab');
    localStorage.removeItem('active_subtab_usermanagement');
    setUser(null);
    setToken(null);
  };

  // Se o caminho for de redefinição de senha (/reset-password)
  const isResetPasswordPage = pathname.includes('/reset-password');
  if (isResetPasswordPage) {
    return (
      <ResetPassword
        onResetSuccess={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Se o caminho for de cadastro via convite (/register ou ?token=...)
  const isRegisterPage = pathname.includes('/register') || (window.location.search.includes('token=') && !isResetPasswordPage);

  if (isRegisterPage) {
    return (
      <Register
        onRegisterSuccess={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Se o caminho for de upsell público (/upsell/:slug)
  const isUpsellPage = pathname.startsWith('/upsell/');
  if (isUpsellPage) {
    const slug = pathname.replace('/upsell/', '').split('/')[0].split('?')[0];
    return <CheckoutUpsellPage slug={slug} />;
  }

  // Se o caminho for de página de obrigado pública (/thank-you ou /thank-you/:orderCode)
  const isThankYouPage = pathname.startsWith('/thank-you');
  if (isThankYouPage) {
    const orderCode = pathname.replace('/thank-you/', '').replace('/thank-you', '').split('/')[0].split('?')[0];
    return <CheckoutThankYouPage orderCode={orderCode || undefined} />;
  }

  // Se o caminho for de checkout por domínio (/domain/:domain)
  const isDomainPage = pathname.startsWith('/domain/');
  if (isDomainPage) {
    const domainFromPath = pathname.replace('/domain/', '').split('/')[0].split('?')[0];
    return <CheckoutPage domain={domainFromPath} />;
  }

  // Se o caminho for de checkout público (/pay/:slug)
  const isCheckoutPage = pathname.startsWith('/pay/');
  if (isCheckoutPage) {
    const slug = pathname.replace('/pay/', '').split('/')[0].split('?')[0];
    return <CheckoutPage slug={slug} />;
  }

  // Se o caminho for da Central do Comprador pública (/minhas-compras ou /my-orders)
  const isBuyerPortalPage = pathname.startsWith('/minhas-compras') || pathname.startsWith('/my-orders');
  if (isBuyerPortalPage) {
    return <BuyerPortalPage />;
  }

  // Se o usuário não está autenticado, verifica se está em um domínio personalizado whitelabel CNAME
  if (!user || !token) {
    const hostname = window.location.hostname.toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const previewDomain = urlParams.get('domain') || urlParams.get('custom_domain');
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local');
    const isAdminSubdomain = hostname.startsWith('admin.') || hostname.startsWith('painel.') || hostname.startsWith('app.');

    if (previewDomain) {
      return <CustomDomainResolver domain={previewDomain} fallback={<Login onLoginSuccess={handleLoginSuccess} />} />;
    }

    if (!isLocalhost && !isAdminSubdomain && (pathname === '/' || pathname === '')) {
      return <CustomDomainResolver domain={hostname} fallback={<Login onLoginSuccess={handleLoginSuccess} />} />;
    }

    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Se autenticado, exibe a tela inicial com a Sidebar e as funcionalidades
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={user}
        onLogout={handlePromptLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
      />
      <main className="main-content" aria-label="Conteúdo Principal">
        {isSuperAdmin ? (
          <>
            {(['sales', 'overview', 'orders', 'utm_bi', 'recovery', 'proposals'].includes(activeTab)) && (
              <SalesManagement
                currentUser={user}
                initialTab={['recovery', 'proposals', 'orders', 'utm_bi'].includes(activeTab) ? activeTab : 'overview'}
              />
            )}
            {(['products', 'catalog', 'coupons', 'affiliates'].includes(activeTab)) && (
              <ProductsHub
                currentUser={user}
                initialTab={activeTab === 'coupons' ? 'coupons' : activeTab === 'affiliates' ? 'affiliates' : 'catalog'}
              />
            )}
            {(['finance', 'subscriptions', 'gateways'].includes(activeTab)) && (
              <FinanceHub
                currentUser={user}
                initialTab={activeTab === 'gateways' ? 'gateways' : 'subscriptions'}
              />
            )}
            {(['system', 'users', 'logs', 'backup'].includes(activeTab)) && (
              <SystemHub
                currentUser={user}
                initialTab={activeTab === 'logs' ? 'logs' : activeTab === 'backup' ? 'backup' : 'users'}
              />
            )}
          </>
        ) : (
          <div className="restricted-access-container user-welcome-container" data-testid="restricted-access-screen">
            <div className="restricted-card user-welcome-card">
              <div className="user-welcome-icon-box">
                <div className="welcome-avatar-badge" data-testid="welcome-avatar-badge">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
              <h2>Olá, {user?.name || 'Usuário'}!</h2>
              <p className="welcome-subtext">
                Bem-vindo ao <strong>Checkout Jords</strong>. Sua conta está ativa e pronta para uso.
              </p>

              <div className="welcome-info-grid">
                <div className="welcome-info-item">
                  <span className="info-item-label">E-mail</span>
                  <span className="info-item-value">{user?.email || '—'}</span>
                </div>
                <div className="welcome-info-item">
                  <span className="info-item-label">Status</span>
                  <span className="info-item-badge status-active">
                    <span className="status-dot"></span> Ativo
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="welcome-action-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                  data-testid="welcome-configure-financial-btn"
                >
                  Configurar Dados de Repasse (Split / Pix)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutModal(false)}
      />

      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUser={user}
        onUserUpdated={(updated) => {
          setUser(updated);
          localStorage.setItem('auth_user', JSON.stringify(updated));
        }}
      />
    </div>
  );
}

export default App;
