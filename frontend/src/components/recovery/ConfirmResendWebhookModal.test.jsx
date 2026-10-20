import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmResendWebhookModal from './ConfirmResendWebhookModal';

describe('ConfirmResendWebhookModal Component', () => {
  const mockCart = {
    id: 10,
    customer_name: 'Mateus Pereira',
    customer_email: 'mateus@gmail.com',
    product_name: 'Produto Jordão',
    offer_name: 'Oferta Principal',
  };

  it('does not render when isOpen is false', () => {
    render(<ConfirmResendWebhookModal isOpen={false} cart={mockCart} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByTestId('confirm-resend-webhook-modal-content')).not.toBeInTheDocument();
  });

  it('renders modal details with lead info and confirmation buttons', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmResendWebhookModal
        isOpen={true}
        cart={mockCart}
        loading={false}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const modal = screen.getByTestId('confirm-resend-webhook-modal-content');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('Reenviar Webhook de Abandono')).toBeInTheDocument();
    expect(screen.getByText('Mateus Pereira')).toBeInTheDocument();
    expect(screen.getByText('mateus@gmail.com')).toBeInTheDocument();
    expect(modal).toHaveTextContent('Produto Jordão (Oferta Principal)');

    const cancelBtn = screen.getByTestId('btn-cancel-resend-webhook');
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);

    const confirmBtn = screen.getByTestId('btn-confirm-resend-webhook');
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and displays loading spinner when loading is true', () => {
    render(
      <ConfirmResendWebhookModal
        isOpen={true}
        cart={mockCart}
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('btn-cancel-resend-x')).toBeDisabled();
    expect(screen.getByTestId('btn-cancel-resend-webhook')).toBeDisabled();
    expect(screen.getByTestId('btn-confirm-resend-webhook')).toBeDisabled();
    expect(screen.getByText('Reenviando...')).toBeInTheDocument();
  });
});
