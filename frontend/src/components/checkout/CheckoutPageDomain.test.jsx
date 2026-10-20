import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutPage from './CheckoutPage';
import * as checkoutApi from './checkoutApi';

vi.mock('./pixelService', () => ({
  initMetaPixel: vi.fn(),
  trackPixelPageView: vi.fn(),
  trackPixelInitiateCheckout: vi.fn(),
  trackPixelPurchase: vi.fn(),
}));

const mockProductWithDomain = {
  id: 201,
  name: 'Mentoria Exclusiva Whitelabel',
  slug: 'mentoria-exclusiva',
  custom_domain: 'pay.expertvip.com',
  description: 'Acesso VIP',
  offers: [
    {
      id: 501,
      name: 'Oferta Principal',
      slug: 'oferta-principal',
      price: 1997.0,
      currency: 'BRL',
      is_default: true,
      billing_type: 'one_time',
      payment_methods: ['pix', 'credit_card'],
    },
  ],
  order_bumps: [],
};

describe('CheckoutPage - Carregamento por Domínio Próprio (Whitelabel CNAME)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega o produto com sucesso ao receber a prop domain em vez de slug', async () => {
    const fetchDomainSpy = vi
      .spyOn(checkoutApi, 'fetchPublicProductByDomainApi')
      .mockResolvedValue(mockProductWithDomain);

    render(<CheckoutPage domain="pay.expertvip.com" />);

    await screen.findByTestId('checkout-page');

    expect(fetchDomainSpy).toHaveBeenCalledWith('pay.expertvip.com');
    expect(screen.getByText('Mentoria Exclusiva Whitelabel')).toBeInTheDocument();
  });

  it('exibe mensagem de erro amigável quando o domínio não é encontrado', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductByDomainApi').mockRejectedValue(
      new Error('Produto não encontrado para o domínio informado.')
    );

    render(<CheckoutPage domain="dominio-invalido.com" />);

    await screen.findByTestId('checkout-error');
    expect(
      screen.getByText(/Produto não encontrado para o domínio informado\./i)
    ).toBeInTheDocument();
  });
});
