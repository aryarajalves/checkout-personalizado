import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrdersReportTab from './OrdersReportTab';

describe('OrdersReportTab Component', () => {
  const mockOrders = [
    {
      id: 1,
      order_code: 'ORD-001',
      created_at: '2026-10-17T12:00:00Z',
      customer_name: 'Ana Souza',
      customer_email: 'ana@example.com',
      product_name: 'Curso de React',
      offer_name: 'Vitalício',
      payment_method: 'pix',
      amount_brl: 197.0,
      status: 'paid',
      utm_source: 'instagram',
    },
    {
      id: 2,
      order_code: 'ORD-002',
      created_at: '2026-10-17T13:00:00Z',
      customer_name: 'Bruno Lima',
      customer_email: 'bruno@example.com',
      product_name: 'E-book Python',
      offer_name: 'Standard',
      payment_method: 'credit_card',
      amount_brl: 47.0,
      status: 'pending',
      utm_source: '',
    },
    {
      id: 3,
      order_code: 'ORD-003',
      created_at: '2026-10-17T14:00:00Z',
      customer_name: 'Carla Dias',
      customer_email: 'carla@example.com',
      product_name: 'Mentoria VIP',
      offer_name: 'Anual',
      payment_method: 'crypto',
      amount_brl: 997.0,
      status: 'refunded',
      refund_reason: 'Desistência no prazo',
      utm_source: 'google',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders orders table with items and pagination bar', () => {
    render(
      <OrdersReportTab
        orders={mockOrders}
        totalOrders={3}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        searchTerm=""
        onSearchChange={vi.fn()}
        statusFilter=""
        onStatusFilterChange={vi.fn()}
        methodFilter=""
        onMethodFilterChange={vi.fn()}
        onExportCsv={vi.fn()}
        onViewDetails={vi.fn()}
        onOpenRefund={vi.fn()}
        onDeleteOrder={vi.fn()}
        onBulkDeleteOrders={vi.fn()}
      />
    );

    expect(screen.getByTestId('orders-table')).toBeInTheDocument();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('ORD-003')).toBeInTheDocument();
    expect(screen.getByTestId('orders-pagination-bar')).toHaveTextContent(
      'Mostrando 1 a 3 de 3 pedidos (20 por página)'
    );
  });

  it('allows selecting individual rows and shows contextual bulk bar', () => {
    render(
      <OrdersReportTab
        orders={mockOrders}
        totalOrders={3}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onMethodFilterChange={vi.fn()}
        onExportCsv={vi.fn()}
        onViewDetails={vi.fn()}
        onOpenRefund={vi.fn()}
        onDeleteOrder={vi.fn()}
        onBulkDeleteOrders={vi.fn()}
      />
    );

    // Initial state: no bulk actions bar
    expect(screen.queryByTestId('orders-bulk-actions-bar')).not.toBeInTheDocument();

    // Select row 1
    const checkbox1 = screen.getByTestId('select-order-checkbox-1');
    fireEvent.click(checkbox1);

    expect(screen.getByTestId('orders-bulk-actions-bar')).toBeInTheDocument();
    expect(screen.getByText(/1 pedido selecionado/i)).toBeInTheDocument();

    // Select row 2
    const checkbox2 = screen.getByTestId('select-order-checkbox-2');
    fireEvent.click(checkbox2);
    expect(screen.getByText(/2 pedidos selecionados/i)).toBeInTheDocument();

    // Deselect all button in bar
    const deselectBtn = screen.getByTestId('btn-clear-selection');
    fireEvent.click(deselectBtn);
    expect(screen.queryByTestId('orders-bulk-actions-bar')).not.toBeInTheDocument();
  });

  it('selects all orders on page when header checkbox is toggled', () => {
    render(
      <OrdersReportTab
        orders={mockOrders}
        totalOrders={3}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onMethodFilterChange={vi.fn()}
        onExportCsv={vi.fn()}
        onViewDetails={vi.fn()}
        onOpenRefund={vi.fn()}
        onDeleteOrder={vi.fn()}
        onBulkDeleteOrders={vi.fn()}
      />
    );

    const selectAllCheckbox = screen.getByTestId('select-all-orders-checkbox');
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByTestId('orders-bulk-actions-bar')).toBeInTheDocument();
    expect(screen.getByText(/3 pedidos selecionados/i)).toBeInTheDocument();

    // Toggling again unchecks all
    fireEvent.click(selectAllCheckbox);
    expect(screen.queryByTestId('orders-bulk-actions-bar')).not.toBeInTheDocument();
  });

  it('opens confirmation modal and executes single order deletion', async () => {
    const mockDelete = vi.fn().mockResolvedValue(true);

    render(
      <OrdersReportTab
        orders={mockOrders}
        totalOrders={3}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onMethodFilterChange={vi.fn()}
        onExportCsv={vi.fn()}
        onViewDetails={vi.fn()}
        onOpenRefund={vi.fn()}
        onDeleteOrder={mockDelete}
        onBulkDeleteOrders={vi.fn()}
      />
    );

    // Click delete for order 1
    const deleteBtn = screen.getByTestId('delete-order-btn-1');
    fireEvent.click(deleteBtn);

    // Modal opens
    const modal = screen.getByTestId('confirm-delete-order-modal-content');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Excluir Pedido');
    expect(modal).toHaveTextContent('ORD-001');
    expect(modal).toHaveTextContent('Ana Souza');

    // Confirm deletion
    const confirmBtn = screen.getByTestId('btn-confirm-delete-order');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });

    // Modal closed
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-order-modal-content')).not.toBeInTheDocument();
    });
  });

  it('opens confirmation modal and executes bulk deletion', async () => {
    const mockBulkDelete = vi.fn().mockResolvedValue({ deleted_count: 2 });

    render(
      <OrdersReportTab
        orders={mockOrders}
        totalOrders={3}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onMethodFilterChange={vi.fn()}
        onExportCsv={vi.fn()}
        onViewDetails={vi.fn()}
        onOpenRefund={vi.fn()}
        onDeleteOrder={vi.fn()}
        onBulkDeleteOrders={mockBulkDelete}
      />
    );

    // Select row 1 and row 2
    fireEvent.click(screen.getByTestId('select-order-checkbox-1'));
    fireEvent.click(screen.getByTestId('select-order-checkbox-2'));

    // Click bulk delete button in bar
    const bulkDeleteBtn = screen.getByTestId('btn-bulk-delete');
    fireEvent.click(bulkDeleteBtn);

    // Modal opens in bulk mode
    const modal = screen.getByTestId('confirm-delete-order-modal-content');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Excluir Pedidos em Massa');
    expect(modal).toHaveTextContent('2 pedidos selecionados');

    // Confirm deletion
    const confirmBtn = screen.getByTestId('btn-confirm-delete-order');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockBulkDelete).toHaveBeenCalledWith([1, 2]);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-order-modal-content')).not.toBeInTheDocument();
    });
  });

  it('cancels deletion when cancel button is clicked in modal', () => {
    const mockDelete = vi.fn();

    render(
      <OrdersReportTab
        orders={mockOrders}
        totalOrders={3}
        currentPage={1}
        pageSize={20}
        onPageChange={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onMethodFilterChange={vi.fn()}
        onExportCsv={vi.fn()}
        onViewDetails={vi.fn()}
        onOpenRefund={vi.fn()}
        onDeleteOrder={mockDelete}
        onBulkDeleteOrders={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('delete-order-btn-1'));
    expect(screen.getByTestId('confirm-delete-order-modal-content')).toBeInTheDocument();

    const cancelBtn = screen.getByTestId('btn-cancel-delete-order');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('confirm-delete-order-modal-content')).not.toBeInTheDocument();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('triggers onPageChange when pagination buttons are clicked', () => {
    const onPageChange = vi.fn();

    render(
      <OrdersReportTab
        orders={mockOrders}
        totalOrders={50}
        currentPage={1}
        pageSize={20}
        onPageChange={onPageChange}
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onMethodFilterChange={vi.fn()}
        onExportCsv={vi.fn()}
        onViewDetails={vi.fn()}
        onOpenRefund={vi.fn()}
        onDeleteOrder={vi.fn()}
        onBulkDeleteOrders={vi.fn()}
      />
    );

    const nextBtn = screen.getByTestId('btn-pagination-next');
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);

    const page3Btn = screen.getByTestId('btn-pagination-page-3');
    fireEvent.click(page3Btn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
