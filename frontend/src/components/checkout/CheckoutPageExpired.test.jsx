import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutPage from './CheckoutPage';
import * as checkoutApi from './checkoutApi';

describe('CheckoutPage - Validação de Link Expirado', () => {
  const mockProduct = {
    id: 1,
    name: 'Bússola Astrológica',
    slug: 'bussola-astrologica',
    price_brl: 4500.0,
    is_active: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.location;
    window.location = new URL('http://localhost:3003/pay/bussola-astrologica?proposal=PROP-20261016-DDD71A');
  });

  it('bloqueia completamente o formulário de pagamento e exibe texto GRANDE de expiração quando proposta estiver expirada', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/v1/proposals/public/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            proposal_code: 'PROP-20261016-DDD71A',
            product_id: 1,
            product_slug: 'bussola-astrologica',
            title: 'Mentoria VIP - Condição Especial WhatsApp',
            customer_name: 'Carlos Roberto',
            amount_brl: 3500.0,
            status: 'expired',
            is_expired: true,
            expires_at: '2026-10-18T20:53:16.541836Z',
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CheckoutPage slug="bussola-astrologica" />);

    // Deve exibir a tela de oferta expirada
    await waitFor(() => {
      expect(screen.getByTestId('checkout-expired-screen')).toBeInTheDocument();
    });

    // Texto GRANDE de expiração e detalhes
    expect(screen.getByTestId('expired-screen-title')).toHaveTextContent('Este Link de Pagamento Expirou');
    expect(screen.getByTestId('expired-screen-notice')).toHaveTextContent('Este link foi expirado devido à data e horário limite de validade terem se encerrado.');
    expect(screen.getByText(/Prazo limite encerrado em:/)).toBeInTheDocument();

    // NENHUM campo do formulário de pagamento deve estar presente
    expect(screen.queryByTestId('checkout-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkout-input-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkout-input-email')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkout-submit-button')).not.toBeInTheDocument();
    expect(screen.queryByText(/Total a Pagar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dados Pessoais/i)).not.toBeInTheDocument();
  });
});
