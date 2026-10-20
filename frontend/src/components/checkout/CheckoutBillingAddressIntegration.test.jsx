import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from './CheckoutPage';
import * as checkoutApi from './checkoutApi';

vi.mock('../recovery/useLeadCapture', () => ({
  default: vi.fn(),
}));

const mockProduct = {
  id: 1,
  name: 'Mentoria High-Ticket VIP',
  slug: 'mentoria-vip',
  price_brl: 1500.0,
  require_cpf: false,
  require_billing_address: true,
  payment_methods: 'all',
  offers: [],
  order_bumps: [],
  upsells: [],
};

const mockOrder = {
  order_id: 201,
  order_code: 'ORD-20261019-ADDR',
  status: 'paid',
  payment_method: 'credit_card',
  amount_brl: 1500.0,
};

describe('CheckoutBillingAddress Integration in CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);
  });

  it('does NOT display Billing Address section when paymentMethod is Pix', async () => {
    render(<CheckoutPage slug="mentoria-vip" />);
    await screen.findByTestId('checkout-page');

    // Por padrão o método inicial é Pix
    expect(screen.queryByTestId('checkout-billing-address')).not.toBeInTheDocument();
  });

  it('displays Billing Address section when Cartão is selected on a product with require_billing_address=true', async () => {
    render(<CheckoutPage slug="mentoria-vip" />);
    await screen.findByTestId('checkout-page');

    // Clica na aba Cartão
    fireEvent.click(screen.getByTestId('tab-payment-card'));

    // Agora o bloco de endereço de cobrança deve estar visível
    expect(await screen.findByTestId('checkout-billing-address')).toBeInTheDocument();
    expect(screen.getByTestId('input-billing-zip-code')).toBeInTheDocument();
    expect(screen.getByTestId('input-billing-street')).toBeInTheDocument();
  });

  it('submits checkout payload with billing address fields when card is used', async () => {
    const processSpy = vi.spyOn(checkoutApi, 'processCheckoutApi').mockResolvedValue(mockOrder);

    render(<CheckoutPage slug="mentoria-vip" />);
    await screen.findByTestId('checkout-page');

    // Preenche dados pessoais
    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Lucas Lima' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'lucas@example.com' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '11999998888' } });

    // Seleciona Cartão
    fireEvent.click(screen.getByTestId('tab-payment-card'));
    await screen.findByTestId('checkout-billing-address');

    // Preenche dados do cartão
    fireEvent.change(screen.getByTestId('input-card-number'), { target: { value: '4111 1111 1111 1111' } });
    fireEvent.change(screen.getByTestId('input-card-holder'), { target: { value: 'LUCAS LIMA' } });
    fireEvent.change(screen.getByTestId('input-card-expiry'), { target: { value: '12/28' } });
    fireEvent.change(screen.getByTestId('input-card-cvv'), { target: { value: '123' } });

    // Preenche endereço de cobrança
    fireEvent.change(screen.getByTestId('input-billing-zip-code'), { target: { value: '01310-100' } });
    fireEvent.change(screen.getByTestId('input-billing-street'), { target: { value: 'Avenida Paulista' } });
    fireEvent.change(screen.getByTestId('input-billing-number'), { target: { value: '1000' } });
    fireEvent.change(screen.getByTestId('input-billing-neighborhood'), { target: { value: 'Bela Vista' } });
    fireEvent.change(screen.getByTestId('input-billing-city'), { target: { value: 'São Paulo' } });
    fireEvent.change(screen.getByTestId('input-billing-state'), { target: { value: 'SP' } });

    // Finaliza compra
    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Lucas Lima',
          email: 'lucas@example.com',
          payment_method: 'credit_card',
          billing_zip_code: '01310-100',
          billing_street: 'Avenida Paulista',
          billing_number: '1000',
          billing_neighborhood: 'Bela Vista',
          billing_city: 'São Paulo',
          billing_state: 'SP',
        })
      );
    });
  });
});
