import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RefundModal from './RefundModal';
import * as salesApi from './salesApi';
import { ToastProvider } from '../../context/ToastContext';

vi.mock('./salesApi');

describe('RefundModal Component', () => {
  const mockOrder = {
    id: 101,
    order_code: 'ORD-TEST-101',
    customer_name: 'Carlos Oliveira',
    amount_brl: 250.0,
    payment_method: 'pix',
    status: 'paid',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ToastProvider>
        <RefundModal isOpen={false} order={mockOrder} onClose={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.queryByTestId('refund-order-modal')).not.toBeInTheDocument();
  });

  it('renders order summary, refund reasons and action buttons', () => {
    render(
      <ToastProvider>
        <RefundModal isOpen={true} order={mockOrder} onClose={vi.fn()} />
      </ToastProvider>
    );

    expect(screen.getByTestId('refund-order-modal')).toBeInTheDocument();
    expect(screen.getByText(/Estornar Pedido ORD-TEST-101/i)).toBeInTheDocument();
    expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*250,00/i)).toBeInTheDocument();

    expect(screen.getByTestId('refund-reason-select')).toBeInTheDocument();
    expect(screen.getByTestId('refund-notes-input')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-refund-btn')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-refund-btn')).toBeInTheDocument();
  });

  it('requires notes when "Outro motivo (especificar)" is selected', async () => {
    render(
      <ToastProvider>
        <RefundModal isOpen={true} order={mockOrder} onClose={vi.fn()} />
      </ToastProvider>
    );

    const select = screen.getByTestId('refund-reason-select');
    fireEvent.change(select, { target: { value: 'Outro motivo (especificar)' } });

    const confirmBtn = screen.getByTestId('confirm-refund-btn');
    fireEvent.click(confirmBtn);

    expect(screen.getByTestId('refund-error-message')).toHaveTextContent(
      'Por favor, especifique o motivo no campo de observações.'
    );
    expect(salesApi.refundOrderApi).not.toHaveBeenCalled();
  });

  it('successfully submits refund and calls onRefundSuccess and onClose', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    vi.spyOn(salesApi, 'refundOrderApi').mockResolvedValue({
      success: true,
      message: 'Pedido estornado com sucesso!',
      order_id: 101,
      status: 'refunded',
      refund_reason: 'Arrependimento de compra / Prazo de 7 dias - Cliente solicitou estorno.',
      refunded_at: '2026-10-17T12:00:00Z',
    });

    render(
      <ToastProvider>
        <RefundModal
          isOpen={true}
          order={mockOrder}
          onClose={handleClose}
          onRefundSuccess={handleSuccess}
        />
      </ToastProvider>
    );

    const notesInput = screen.getByTestId('refund-notes-input');
    fireEvent.change(notesInput, { target: { value: 'Cliente solicitou estorno.' } });

    const confirmBtn = screen.getByTestId('confirm-refund-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(salesApi.refundOrderApi).toHaveBeenCalledWith(101, {
        reason: 'Arrependimento de compra / Prazo de 7 dias',
        notes: 'Cliente solicitou estorno.',
      });
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 101,
          status: 'refunded',
          refund_reason: 'Arrependimento de compra / Prazo de 7 dias - Cliente solicitou estorno.',
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
