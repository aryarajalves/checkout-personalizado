import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  it('renders "Checkout Jords" title and logo', () => {
    render(<Sidebar />);
    expect(screen.getByText('Checkout Jords')).toBeInTheDocument();
    expect(screen.getByTestId('logo-icon')).toBeInTheDocument();
  });

  it('renders categorized menu sections and buttons only for superadmin', () => {
    // Superadmin vê os 4 módulos principais
    const superAdminUser = { name: 'Super Admin', email: 'admin@test.com', role: 'superadmin' };
    const { unmount } = render(<Sidebar user={superAdminUser} />);
    expect(screen.queryByText('Meus vídeos')).not.toBeInTheDocument();

    // Seção principal
    expect(screen.getByTestId('nav-section-main')).toHaveTextContent('Módulos Principais');

    // Botões dos 4 Módulos
    expect(screen.getByText('Vendas & Comercial')).toBeInTheDocument();
    expect(screen.getByText('Produtos & Marketing')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Configurações & Sistema')).toBeInTheDocument();
    unmount();

    // Usuário comum NÃO vê a seção de módulos de administração
    const regularUser = { name: 'Comum', email: 'comum@test.com', role: 'user' };
    render(<Sidebar user={regularUser} />);
    expect(screen.queryByTestId('nav-section-main')).not.toBeInTheDocument();
    expect(screen.queryByText('Vendas & Comercial')).not.toBeInTheDocument();
    expect(screen.queryByText('Produtos & Marketing')).not.toBeInTheDocument();
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument();
    expect(screen.queryByText('Configurações & Sistema')).not.toBeInTheDocument();
  });

  it('renders user profile details and logout button', () => {
    const handleLogout = vi.fn();
    const user = { name: 'Super Admin', email: 'aryarajmarketing@gmail.com', role: 'superadmin' };
    render(<Sidebar user={user} onLogout={handleLogout} />);

    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('aryarajmarketing@gmail.com')).toBeInTheDocument();
    expect(screen.getByTestId('user-avatar')).toHaveTextContent('S');

    const logoutBtn = screen.getByTestId('logout-btn');
    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalled();
  });

  it('allows clicking buttons and changing active state for superadmin', () => {
    const onSelectTabMock = vi.fn();
    const superAdminUser = { name: 'Super Admin', email: 'admin@test.com', role: 'superadmin' };
    render(<Sidebar user={superAdminUser} activeTab="users" onSelectTab={onSelectTabMock} />);

    // Quando activeTab é 'users', o botão 'Configurações & Sistema' deve estar ativo
    const systemBtn = screen.getByTestId('nav-item-system');
    expect(systemBtn.className).toContain('active');

    // Clicar em Produtos & Marketing chama onSelectTab com 'products'
    const productsBtn = screen.getByTestId('nav-item-products');
    fireEvent.click(productsBtn);
    expect(onSelectTabMock).toHaveBeenCalledWith('products');
  });

  it('renders settings button and triggers onOpenSettings when clicked', () => {
    const onOpenSettingsMock = vi.fn();
    const user = { name: 'João Afiliado', email: 'joao@afiliado.com', role: 'user' };
    render(<Sidebar user={user} onOpenSettings={onOpenSettingsMock} />);

    const settingsBtn = screen.getByTestId('sidebar-settings-btn');
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);
    expect(onOpenSettingsMock).toHaveBeenCalledTimes(1);
  });
});
