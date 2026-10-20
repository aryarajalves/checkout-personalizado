import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AbandonedCartsTab from './AbandonedCartsTab';
import * as recoveryApi from './recoveryApi';

describe('AbandonedCartsTab Component', () => {
  const mockCarts = [
    {
      id: 1,
      customer_name: 'Mateus Pereira',
      customer_email: 'mateus@gmail.com',
      customer_phone: '85988146141',
      customer_phone_formatted: '+55 (85) 98814-6141',
      product_name: 'Produto Jordão',
      offer_name: 'Oferta Principal',
      estimated_amount_brl: 97.0,
      status: 'abandoned',
      created_at: '2026-10-17T16:26:15Z',
      recovery_url: '/pay/produto-jordao?recover=tok1',
      contacted: false,
    },
    {
      id: 2,
      customer_name: 'Aryaraj Fernandes',
      customer_email: 'aryarajunity@gmail.com',
      customer_phone: '8588146141',
      customer_phone_formatted: '+55 (85) 8814-6141',
      product_name: 'Produto Jordão',
      offer_name: 'Oferta 37',
      estimated_amount_brl: 37.0,
      status: 'converted',
      created_at: '2026-10-17T16:18:35Z',
      recovery_url: '/pay/produto-jordao?recover=tok2',
      contacted: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 20 items per page and pagination bar', () => {
    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={25}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={vi.fn()}
        onBulkDeleteCarts={vi.fn()}
      />
    );

    expect(screen.getByTestId('abandoned-carts-table')).toBeInTheDocument();
    expect(screen.getByText('Mateus Pereira')).toBeInTheDocument();
    expect(screen.getByText('Aryaraj Fernandes')).toBeInTheDocument();
    expect(screen.getByTestId('recovery-pagination-bar')).toHaveTextContent(
      'Mostrando 1 a 20 de 25 carrinhos (20 por página)'
    );
  });

  it('renders right-side action buttons with enhanced styles', () => {
    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={2}
        currentPage={1}
        pageSize={2}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={vi.fn()}
        onBulkDeleteCarts={vi.fn()}
      />
    );

    // WhatsApp button
    const waBtn = screen.getByTestId('btn-whatsapp-1');
    expect(waBtn).toBeInTheDocument();
    expect(waBtn).toHaveClass('action-btn-whatsapp');
    expect(waBtn).toHaveTextContent('Chamar no WhatsApp');

    // Status button for abandoned cart
    const recBtn = screen.getByTestId('btn-mark-recovered-1');
    expect(recBtn).toBeInTheDocument();
    expect(recBtn).toHaveClass('action-btn-secondary');
    expect(recBtn).toHaveTextContent('Recuperado');

    // Resend webhook icon button
    const resendBtn = screen.getByTestId('btn-resend-webhook-1');
    expect(resendBtn).toBeInTheDocument();
    expect(resendBtn).toHaveClass('action-btn-icon');

    // External link icon button
    const openBtn = screen.getByTestId('btn-open-recovery-1');
    expect(openBtn).toBeInTheDocument();
    expect(openBtn).toHaveClass('action-btn-icon');

    // Delete trash button
    const deleteBtn = screen.getByTestId('btn-delete-cart-1');
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toHaveClass('action-btn-danger');
  });

  it('selects individual carts and toggles contextual bulk actions bar', () => {
    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={2}
        currentPage={1}
        pageSize={2}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={vi.fn()}
        onBulkDeleteCarts={vi.fn()}
      />
    );

    expect(screen.queryByTestId('recovery-bulk-actions-bar')).not.toBeInTheDocument();

    const cb1 = screen.getByTestId('select-cart-checkbox-1');
    fireEvent.click(cb1);

    expect(screen.getByTestId('recovery-bulk-actions-bar')).toBeInTheDocument();
    expect(screen.getByText(/1 carrinho selecionado/i)).toBeInTheDocument();

    const cb2 = screen.getByTestId('select-cart-checkbox-2');
    fireEvent.click(cb2);
    expect(screen.getByText(/2 carrinhos selecionados/i)).toBeInTheDocument();

    const clearBtn = screen.getByTestId('btn-clear-selection-cart');
    fireEvent.click(clearBtn);
    expect(screen.queryByTestId('recovery-bulk-actions-bar')).not.toBeInTheDocument();
  });

  it('selects all carts on page with header checkbox', () => {
    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={2}
        currentPage={1}
        pageSize={2}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={vi.fn()}
        onBulkDeleteCarts={vi.fn()}
      />
    );

    const selectAllCb = screen.getByTestId('select-all-carts-checkbox');
    fireEvent.click(selectAllCb);

    expect(screen.getByTestId('recovery-bulk-actions-bar')).toBeInTheDocument();
    expect(screen.getByText(/2 carrinhos selecionados/i)).toBeInTheDocument();

    fireEvent.click(selectAllCb);
    expect(screen.queryByTestId('recovery-bulk-actions-bar')).not.toBeInTheDocument();
  });

  it('opens confirmation modal and executes single cart deletion', async () => {
    const mockDelete = vi.fn().mockResolvedValue(true);

    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={2}
        currentPage={1}
        pageSize={2}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={mockDelete}
        onBulkDeleteCarts={vi.fn()}
      />
    );

    const deleteBtn = screen.getByTestId('btn-delete-cart-1');
    fireEvent.click(deleteBtn);

    const modal = screen.getByTestId('confirm-delete-cart-modal-content');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Mateus Pereira')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('btn-confirm-delete-cart');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-cart-modal-content')).not.toBeInTheDocument();
    });
  });

  it('opens confirmation modal and executes bulk deletion', async () => {
    const mockBulkDelete = vi.fn().mockResolvedValue({ deleted_count: 2 });

    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={2}
        currentPage={1}
        pageSize={2}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={vi.fn()}
        onBulkDeleteCarts={mockBulkDelete}
      />
    );

    fireEvent.click(screen.getByTestId('select-cart-checkbox-1'));
    fireEvent.click(screen.getByTestId('select-cart-checkbox-2'));

    const bulkDeleteBtn = screen.getByTestId('btn-bulk-delete-cart');
    fireEvent.click(bulkDeleteBtn);

    const modal = screen.getByTestId('confirm-delete-cart-modal-content');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(/2 carrinhos abandonados selecionados/i)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('btn-confirm-delete-cart');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockBulkDelete).toHaveBeenCalledWith([1, 2]);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-cart-modal-content')).not.toBeInTheDocument();
    });
  });

  it('opens confirmation modal and resends webhook on confirm', async () => {
    vi.spyOn(recoveryApi, 'resendAbandonedWebhookApi').mockResolvedValue({
      message: 'Webhook reenviado com sucesso para 1 destino.',
    });

    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={2}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={vi.fn()}
        onBulkDeleteCarts={vi.fn()}
      />
    );

    const resendBtn = screen.getByTestId('btn-resend-webhook-1');
    fireEvent.click(resendBtn);

    const modal = screen.getByTestId('confirm-resend-webhook-modal-content');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('Reenviar Webhook de Abandono')).toBeInTheDocument();
    expect(within(modal).getByText('Mateus Pereira')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('btn-confirm-resend-webhook');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(recoveryApi.resendAbandonedWebhookApi).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-resend-webhook-modal-content')).not.toBeInTheDocument();
    });
  });

  it('navigates pages when pagination buttons are clicked', () => {
    const handlePageChange = vi.fn();

    render(
      <AbandonedCartsTab
        carts={mockCarts}
        totalCarts={60}
        currentPage={1}
        pageSize={20}
        onPageChange={handlePageChange}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onDeleteCart={vi.fn()}
        onBulkDeleteCarts={vi.fn()}
      />
    );

    const nextBtn = screen.getByTestId('btn-pagination-next');
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);

    const page3Btn = screen.getByTestId('btn-pagination-page-3');
    fireEvent.click(page3Btn);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });
});

