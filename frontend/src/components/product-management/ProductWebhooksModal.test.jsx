import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductWebhooksModal } from './ProductWebhooksModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductWebhooksApi: vi.fn(),
  createProductWebhookApi: vi.fn(),
  updateProductWebhookApi: vi.fn(),
  deleteProductWebhookApi: vi.fn(),
  testProductWebhookApi: vi.fn(),
  fetchWebhookDispatchLogsApi: vi.fn(),
  retryWebhookDispatchApi: vi.fn(),
}));

describe('ProductWebhooksModal Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Produto Teste Webhook',
    slug: 'produto-teste-webhook',
    price_brl: 197.0,
  };

  const mockWebhooks = [
    {
      id: 10,
      product_id: 1,
      name: 'n8n Automações VIP',
      url: 'https://meun8n.com/webhook/test',
      events: ['order.approved', 'order.waiting_payment'],
      secret_key: 'secret123',
      is_active: true,
      created_at: '2026-10-16T00:00:00Z',
    },
  ];

  const mockLogs = [
    {
      id: 101,
      product_id: 1,
      webhook_id: 10,
      event: 'order.approved',
      url: 'https://meun8n.com/webhook/test',
      payload: '{"test": true}',
      response_status_code: 200,
      success: true,
      dispatched_at: '2026-10-16T03:00:00Z', // 03:00 UTC = 00:00 no Horário de Brasília
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    productApi.fetchProductWebhooksApi.mockResolvedValue(mockWebhooks);
    productApi.fetchWebhookDispatchLogsApi.mockResolvedValue(mockLogs);
  });

  it('renders modal with product title, webhook name and default tab', async () => {
    render(<ProductWebhooksModal product={mockProduct} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Webhooks de Saída')).toBeInTheDocument();
    expect(screen.getByText('Produto Teste Webhook')).toBeInTheDocument();
    expect(screen.getByText(/Configurações de Webhook/i)).toBeInTheDocument();
    expect(screen.getByText(/Histórico de Disparos/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('n8n Automações VIP')).toBeInTheDocument();
      expect(screen.getByText('https://meun8n.com/webhook/test')).toBeInTheDocument();
    });
  });

  it('allows opening new webhook form with name input and toggling event checkboxes', async () => {
    render(<ProductWebhooksModal product={mockProduct} isOpen={true} onClose={vi.fn()} />);

    const newBtn = screen.getByRole('button', { name: /Novo Webhook/i });
    fireEvent.click(newBtn);

    expect(screen.getByTestId('input-webhook-name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/seu-servidor.com/i)).toBeInTheDocument();
    expect(screen.getByText('Compra Aprovada')).toBeInTheDocument();
    expect(screen.getByText('Pix Gerado')).toBeInTheDocument();
    expect(screen.getByText('Reembolso')).toBeInTheDocument();
    expect(screen.getByText('Chargeback')).toBeInTheDocument();
    expect(screen.getByText('Cartão Recusado')).toBeInTheDocument();
    expect(screen.getByText('Pix Expirado')).toBeInTheDocument();
  });

  it('switches to logs tab and displays dispatch history with Brasília time and Retry button', async () => {
    render(<ProductWebhooksModal product={mockProduct} isOpen={true} onClose={vi.fn()} />);

    const logsTabBtn = screen.getByText(/Histórico de Disparos/i);
    fireEvent.click(logsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 200/i)).toBeInTheDocument();
      // 03:00 UTC em Brasília (UTC-3) é 00:00:00
      expect(screen.getByTestId('log-date-101')).toHaveTextContent('00:00:00');
      // Botão Reenviar visível e acionável
      expect(screen.getByTestId('retry-webhook-btn-101')).toBeInTheDocument();
      expect(screen.getByText('Reenviar')).toBeInTheDocument();
    });
  });

  it('calls onClose when close buttons are clicked', () => {
    const handleClose = vi.fn();
    render(<ProductWebhooksModal product={mockProduct} isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Fechar' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('opens styled confirmation popup when delete is clicked and handles cancel/confirm', async () => {
    productApi.deleteProductWebhookApi.mockResolvedValue({ detail: 'Webhook removido com sucesso.' });
    render(<ProductWebhooksModal product={mockProduct} isOpen={true} onClose={vi.fn()} />);

    // 1. Aguarda card de webhook aparecer
    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-webhook-10')).toBeInTheDocument();
    });

    // 2. Clica no botão de excluir
    fireEvent.click(screen.getByTestId('btn-delete-webhook-10'));

    // 3. Modal centralizado deve abrir com backdrop
    expect(screen.getByTestId('webhook-delete-modal-overlay')).toBeInTheDocument();
    const modalContent = screen.getByTestId('webhook-delete-modal-content');
    expect(modalContent).toBeInTheDocument();
    expect(within(modalContent).getByText('Excluir Webhook?')).toBeInTheDocument();
    expect(within(modalContent).getByText(/"n8n Automações VIP"/i)).toBeInTheDocument();
    expect(within(modalContent).getByText('https://meun8n.com/webhook/test')).toBeInTheDocument();

    // 4. Clicar no overlay (backdrop) NÃO deve fechar (regra do sistema)
    fireEvent.click(screen.getByTestId('webhook-delete-modal-overlay'));
    expect(screen.getByTestId('webhook-delete-modal-content')).toBeInTheDocument();

    // 5. Clicar em Cancelar fecha o modal sem deletar
    fireEvent.click(screen.getByTestId('cancel-delete-webhook-btn'));
    expect(screen.queryByTestId('webhook-delete-modal-content')).not.toBeInTheDocument();
    expect(productApi.deleteProductWebhookApi).not.toHaveBeenCalled();

    // 6. Reabre e confirma a exclusão
    fireEvent.click(screen.getByTestId('btn-delete-webhook-10'));
    fireEvent.click(screen.getByTestId('confirm-delete-webhook-btn'));

    await waitFor(() => {
      expect(productApi.deleteProductWebhookApi).toHaveBeenCalledWith(1, 10);
      expect(screen.queryByTestId('webhook-delete-modal-content')).not.toBeInTheDocument();
    });
  });

  it('opens styled confirmation popup when retry is clicked and handles cancel and confirm retry', async () => {
    productApi.retryWebhookDispatchApi.mockResolvedValue({
      success: true,
      response_status_code: 200,
      log_id: 102,
    });
    render(<ProductWebhooksModal product={mockProduct} isOpen={true} onClose={vi.fn()} />);

    // 1. Ir para a aba de histórico
    const logsTabBtn = screen.getByText(/Histórico de Disparos/i);
    fireEvent.click(logsTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('retry-webhook-btn-101')).toBeInTheDocument();
    });

    // 2. Clicar em Reenviar
    fireEvent.click(screen.getByTestId('retry-webhook-btn-101'));

    // 3. Modal centralizado deve abrir com backdrop
    expect(screen.getByTestId('webhook-retry-modal-overlay')).toBeInTheDocument();
    const modalContent = screen.getByTestId('webhook-retry-modal-content');
    expect(modalContent).toBeInTheDocument();
    expect(within(modalContent).getByText('Reenviar Webhook?')).toBeInTheDocument();
    expect(within(modalContent).getByText(/"Compra Aprovada"/i)).toBeInTheDocument();
    expect(within(modalContent).getByText('https://meun8n.com/webhook/test')).toBeInTheDocument();

    // 4. Clicar no overlay (backdrop) NÃO deve fechar (regra do sistema)
    fireEvent.click(screen.getByTestId('webhook-retry-modal-overlay'));
    expect(screen.getByTestId('webhook-retry-modal-content')).toBeInTheDocument();

    // 5. Clicar em Cancelar fecha o modal sem reenviar
    fireEvent.click(screen.getByTestId('cancel-retry-webhook-btn'));
    expect(screen.queryByTestId('webhook-retry-modal-content')).not.toBeInTheDocument();
    expect(productApi.retryWebhookDispatchApi).not.toHaveBeenCalled();

    // 6. Reabre e confirma o reenvio
    fireEvent.click(screen.getByTestId('retry-webhook-btn-101'));
    fireEvent.click(screen.getByTestId('confirm-retry-webhook-btn'));

    await waitFor(() => {
      expect(productApi.retryWebhookDispatchApi).toHaveBeenCalledWith(1, 101);
      expect(screen.queryByTestId('webhook-retry-modal-content')).not.toBeInTheDocument();
    });
  });
});

