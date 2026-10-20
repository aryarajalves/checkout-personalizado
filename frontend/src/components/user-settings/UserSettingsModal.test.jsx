import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserSettingsModal from './UserSettingsModal';
import { ToastProvider } from '../../context/ToastContext';
import * as api from './userSettingsApi';

describe('UserSettingsModal Component', () => {
  const mockUser = {
    id: 1,
    name: 'João Silva',
    email: 'joao@exemplo.com',
    role: 'user',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('auth_token', 'test_token');
  });

  it('does not render when isOpen is false', () => {
    render(
      <ToastProvider>
        <UserSettingsModal
          isOpen={false}
          onClose={vi.fn()}
          currentUser={mockUser}
        />
      </ToastProvider>
    );
    expect(screen.queryByTestId('user-settings-modal')).not.toBeInTheDocument();
  });

  it('renders modal with tabs and loads financial data when isOpen is true', async () => {
    vi.spyOn(api, 'fetchMyFinancialProfileApi').mockResolvedValue({
      id: 1,
      document: '123.456.789-00',
      document_type: 'cpf',
      phone: '11999998888',
      pix_key: 'joao@pix.com',
      pix_key_type: 'email',
      has_financial_profile: true,
    });

    render(
      <ToastProvider>
        <UserSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          currentUser={mockUser}
        />
      </ToastProvider>
    );

    expect(screen.getByTestId('user-settings-modal')).toBeInTheDocument();
    expect(screen.getByTestId('tab-financial-settings')).toBeInTheDocument();
    expect(screen.getByTestId('tab-account-settings')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('input-financial-pix')).toHaveValue('joao@pix.com');
      expect(screen.getByTestId('input-financial-doc')).toHaveValue('123.456.789-00');
    });

    expect(screen.getByTestId('financial-status-badge')).toHaveTextContent(/Dados de Repasse Configurados/i);
  });

  it('allows switching to account tab and displays user information', async () => {
    vi.spyOn(api, 'fetchMyFinancialProfileApi').mockResolvedValue({
      has_financial_profile: false,
    });

    render(
      <ToastProvider>
        <UserSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          currentUser={mockUser}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Carregando dados...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-account-settings'));

    expect(screen.getByTestId('input-account-name')).toHaveValue('João Silva');
    expect(screen.getByTestId('input-account-email')).toHaveValue('joao@exemplo.com');
    expect(screen.getByTestId('input-account-email')).toHaveAttribute('readonly');
  });

  it('saves financial profile successfully and triggers callback', async () => {
    vi.spyOn(api, 'fetchMyFinancialProfileApi').mockResolvedValue({
      has_financial_profile: false,
    });
    const updateSpy = vi.spyOn(api, 'updateMyFinancialProfileApi').mockResolvedValue({
      has_financial_profile: true,
      pix_key: 'nova-chave-pix',
    });
    const onUserUpdatedMock = vi.fn();

    render(
      <ToastProvider>
        <UserSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          currentUser={mockUser}
          onUserUpdated={onUserUpdatedMock}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-financial-pix')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-financial-pix'), {
      target: { value: 'nova-chave-pix' },
    });

    fireEvent.click(screen.getByTestId('save-user-settings-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ pix_key: 'nova-chave-pix' }),
        'test_token'
      );
      expect(onUserUpdatedMock).toHaveBeenCalledWith(
        expect.objectContaining({ has_financial_profile: true })
      );
    });
  });

  it('calls onClose when clicking close button', async () => {
    vi.spyOn(api, 'fetchMyFinancialProfileApi').mockResolvedValue({});
    const onCloseMock = vi.fn();

    render(
      <ToastProvider>
        <UserSettingsModal
          isOpen={true}
          onClose={onCloseMock}
          currentUser={mockUser}
        />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Carregando dados...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cancel-user-settings-btn'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
