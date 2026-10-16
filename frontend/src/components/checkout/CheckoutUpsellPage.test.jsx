import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutUpsellPage from './CheckoutUpsellPage';
import * as checkoutApi from './checkoutApi';
import * as pixelService from './pixelService';

vi.mock('./checkoutApi', () => ({
  fetchPublicProductApi: vi.fn(),
}));

vi.mock('./pixelService', () => ({
  trackPixelPurchase: vi.fn(),
}));

describe('CheckoutUpsellPage - Página de UpSell Pós-Compra', () => {
  const mockProduct = {
    id: 1,
    name: 'Bússola Astrológica',
    slug: 'bussola-astrologica',
    meta_pixel_id: '1234567890',
    upsells: [
      {
        id: 10,
        product_id: 1,
        title: 'Mentoria Exclusiva de Acompanhamento',
        subtitle: 'Apenas nesta oportunidade de checkout',
        description: 'Receba 3 sessões individuais para tirar dúvidas e acelerar seu aprendizado.',
        price_brl: 197.0,
        is_active: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe tela de carregamento e depois os dados da oferta de UpSell', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce(mockProduct);

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    expect(screen.getByTestId('upsell-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('checkout-upsell-page')).toBeInTheDocument();
    });

    expect(screen.getByText('Mentoria Exclusiva de Acompanhamento')).toBeInTheDocument();
    expect(screen.getByText('Apenas nesta oportunidade de checkout')).toBeInTheDocument();
    expect(screen.getByText('R$ 197,00')).toBeInTheDocument();
    expect(screen.getByTestId('accept-upsell-btn')).toBeInTheDocument();
    expect(screen.getByTestId('decline-upsell-btn')).toBeInTheDocument();
  });

  it('permite aceitar a oferta de UpSell e dispara evento de Pixel Purchase', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce(mockProduct);

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    await waitFor(() => {
      expect(screen.getByTestId('accept-upsell-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('accept-upsell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('upsell-result-screen')).toBeInTheDocument();
      expect(screen.getByText('🎉 Oferta Adicionada com Sucesso!')).toBeInTheDocument();
    });

    expect(pixelService.trackPixelPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_brl: 197.0,
      }),
      mockProduct
    );
  });

  it('permite recusar a oferta de UpSell e exibe confirmação do pedido principal', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce(mockProduct);

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    await waitFor(() => {
      expect(screen.getByTestId('decline-upsell-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('decline-upsell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('upsell-result-screen')).toBeInTheDocument();
      expect(screen.getByText('Pedido Principal Confirmado!')).toBeInTheDocument();
    });
  });

  it('exibe tela amigável quando produto não possui upsells ativos', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce({
      ...mockProduct,
      upsells: [],
    });

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    await waitFor(() => {
      expect(screen.getByTestId('upsell-empty')).toBeInTheDocument();
      expect(screen.getByText('Obrigado pela sua compra!')).toBeInTheDocument();
    });
  });

  it('redireciona para external_url ao aceitar oferta quando configurada', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce({
      ...mockProduct,
      upsells: [
        {
          id: 10,
          product_id: 1,
          title: 'Mentoria Exclusiva de Acompanhamento',
          subtitle: 'Apenas nesta oportunidade de checkout',
          description: 'Receba 3 sessões individuais.',
          price_brl: 197.0,
          external_url: 'https://exemplo.com/pagina-upsell-externa',
          is_active: true,
        },
      ],
    });

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    await waitFor(() => {
      expect(screen.getByTestId('accept-upsell-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('accept-upsell-btn'));

    expect(window.location.href).toBe('https://exemplo.com/pagina-upsell-externa');

    window.location = originalLocation;
  });
});
