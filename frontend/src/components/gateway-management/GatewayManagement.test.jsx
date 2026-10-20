import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import GatewayManagement from '../GatewayManagement';
import { ToastProvider } from '../../context/ToastContext';

// Mock dos serviços de API
vi.mock('./gatewayApi', () => ({
  fetchGatewaysApi: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        gateway_name: 'pagarme',
        is_active: true,
        environment: 'sandbox',
        api_key_masked: 'sk_test_****1234',
        public_key: 'pk_test_1234',
      },
      {
        id: 2,
        gateway_name: 'nowpayments',
        is_active: false,
        environment: 'sandbox',
        api_key_masked: null,
      },
    ])
  ),
  saveGatewayApi: vi.fn((data) => Promise.resolve({ ...data, id: 1 })),
  testGatewayConnectionApi: vi.fn(() =>
    Promise.resolve({ success: true, message: 'Conexão bem-sucedida!' })
  ),
  fetchSplitRecipientsApi: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: 'Sócio Parceiro',
        email: 'socio@teste.com',
        document: '123.456.789-00',
        pix_key: 'socio@teste.com',
        pix_key_type: 'email',
        crypto_wallet: '0x1234567890abcdef',
        crypto_network: 'polygon',
        default_percentage: 25.0,
        is_active: true,
      },
    ])
  ),
  createSplitRecipientApi: vi.fn((data) => Promise.resolve({ ...data, id: 2 })),
  updateSplitRecipientApi: vi.fn((id, data) => Promise.resolve({ ...data, id })),
  deleteSplitRecipientApi: vi.fn(() => Promise.resolve({ message: 'Excluído com sucesso' })),
}));

describe('GatewayManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <GatewayManagement currentUser={{ role: 'superadmin' }} />
      </ToastProvider>
    );
  };

  it('renders header, navigation subtabs and gateway cards', async () => {
    renderComponent();

    expect(screen.getByText('Gateways & Split de Pagamento')).toBeInTheDocument();
    expect(screen.getByTestId('subtab-gateways')).toBeInTheDocument();
    expect(screen.getByTestId('subtab-split')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Pagar.me (Stone Co.)')).toBeInTheDocument();
      expect(screen.getByText('NOWPayments (Cripto)')).toBeInTheDocument();
      expect(screen.getByTestId('card-asaas')).toBeInTheDocument();
    });
  });

  it('switches between Gateways and Split Recipients subtabs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('card-pagarme')).toBeInTheDocument();
    });

    const splitSubtab = screen.getByTestId('subtab-split');
    fireEvent.click(splitSubtab);

    await waitFor(() => {
      expect(screen.getByTestId('split-recipients-container')).toBeInTheDocument();
      expect(screen.getByText('Sócio Parceiro')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });

  it('opens recipient modal when clicking "Novo Recebedor"', async () => {
    renderComponent();

    const splitSubtab = screen.getByTestId('subtab-split');
    fireEvent.click(splitSubtab);

    await waitFor(() => {
      expect(screen.getByTestId('add-recipient-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('add-recipient-btn'));

    expect(screen.getByTestId('recipient-modal-overlay')).toBeInTheDocument();
    expect(screen.getByText('Novo Recebedor de Split')).toBeInTheDocument();

    // Fecha o modal
    fireEvent.click(screen.getByTestId('cancel-recipient-btn'));
    expect(screen.queryByTestId('recipient-modal-overlay')).not.toBeInTheDocument();
  });

  it('opens confirmation modal when clicking to delete a recipient', async () => {
    renderComponent();

    const splitSubtab = screen.getByTestId('subtab-split');
    fireEvent.click(splitSubtab);

    await waitFor(() => {
      expect(screen.getByTestId('delete-recipient-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-recipient-1'));

    expect(screen.getByTestId('confirm-delete-recipient-overlay')).toBeInTheDocument();
    expect(screen.getByText('Excluir Recebedor do Split')).toBeInTheDocument();
  });
});
