import React from 'react';
import { Database, Users, LogOut, Terminal, CreditCard, Package, Tag, RotateCcw, Share2, Repeat, BarChart3, Handshake } from 'lucide-react';

export default function Sidebar({ activeTab = 'users', onSelectTab, user, onLogout }) {
  const isSuperAdmin = user?.role === 'superadmin';

  // Regra: As telas de administração aparecem para quem é super admin agrupadas por categoria
  const menuSections = isSuperAdmin
    ? [
        {
          id: 'catalog',
          title: 'Catálogo & Vendas',
          items: [
            { id: 'products', label: 'Produtos & Ofertas', icon: Package },
            { id: 'proposals', label: 'Propostas High-Ticket', icon: Handshake },
            { id: 'coupons', label: 'Cupons de Desconto', icon: Tag },
            { id: 'affiliates', label: 'Gestão de Afiliados', icon: Share2 },
            { id: 'recovery', label: 'Recuperação de Vendas', icon: RotateCcw },
          ],
        },
        {
          id: 'finance',
          title: 'Financeiro',
          items: [
            { id: 'sales', label: 'Painel de Vendas & BI', icon: BarChart3 },
            { id: 'subscriptions', label: 'Assinaturas & MRR', icon: Repeat },
            { id: 'gateways', label: 'Gateways & Split', icon: CreditCard },
          ],
        },
        {
          id: 'system',
          title: 'Sistema & Segurança',
          items: [
            { id: 'users', label: 'Gestão de Usuário', icon: Users },
            { id: 'backup', label: 'Backup Automático', icon: Database },
            { id: 'logs', label: 'Gerenciamento de logs', icon: Terminal },
          ],
        },
      ]
    : [];

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
          <span className="logo-text">Projeto Base</span>
        </div>

        {/* Navigation Categorized Buttons */}
        <nav className="nav-menu">
          {menuSections.map((section) => (
            <div key={section.id} className="nav-section">
              <div className="nav-section-title" data-testid={`nav-section-${section.id}`}>
                {section.title}
              </div>
              <div className="nav-section-items">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
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
          ))}
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
