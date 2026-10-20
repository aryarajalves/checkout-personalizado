import React from 'react';
import {
  BarChart3,
  Package,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react';

export default function Sidebar({ activeTab = 'sales', onSelectTab, user, onLogout, onOpenSettings }) {
  const isSuperAdmin = user?.role === 'superadmin';

  const navItems = isSuperAdmin
    ? [
        { id: 'sales', label: 'Vendas & Comercial', icon: BarChart3 },
        { id: 'products', label: 'Produtos & Marketing', icon: Package },
        { id: 'finance', label: 'Financeiro', icon: CreditCard },
        { id: 'system', label: 'Configurações & Sistema', icon: Settings },
      ]
    : [];

  const getActiveNavId = () => {
    if (['sales', 'overview', 'orders', 'utm_bi', 'recovery', 'proposals'].includes(activeTab)) return 'sales';
    if (['products', 'catalog', 'coupons', 'affiliates'].includes(activeTab)) return 'products';
    if (['finance', 'subscriptions', 'gateways'].includes(activeTab)) return 'finance';
    if (['system', 'users', 'logs', 'backup'].includes(activeTab)) return 'system';
    return activeTab;
  };

  const handleSelect = (id) => {
    if (onSelectTab) {
      onSelectTab(id);
    }
  };

  const userName = user?.name || 'Super Admin';
  const userEmail = user?.email || 'aryarajmarketing@gmail.com';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar" aria-label="Menu Lateral">
      <div className="sidebar-top">
        {/* Logo header */}
        <div className="logo-container">
          <div className="logo-icon" data-testid="logo-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="logo-text">Checkout Jords</span>
        </div>

        {/* Navigation Modules */}
        <nav className="nav-menu">
          {isSuperAdmin && (
            <div className="nav-section">
              <div className="nav-section-title" data-testid="nav-section-main">
                Módulos Principais
              </div>
              <div className="nav-section-items">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = getActiveNavId() === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`nav-button ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelect(item.id)}
                      data-testid={`nav-item-${item.id}`}
                    >
                      <Icon className="nav-icon" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* User profile footer with Logout */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar" data-testid="user-avatar">{userInitial}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-email">{userEmail}</span>
          </div>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="settings-button"
              title="Configurações e Dados Financeiros"
              data-testid="sidebar-settings-btn"
            >
              <Settings size={16} />
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="logout-button"
              title="Sair"
              data-testid="logout-btn"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
