import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutUpsellPage from './CheckoutUpsellPage';
import * as checkoutApi from './checkoutApi';
import * as pixelService from './pixelService';

vi.mock('./checkoutApi', () => ({
  fetchPublicProductApi: vi.fn(),
  fetchOrderByCodeApi: vi.fn(),
  executeOneClickBuyApi: vi.fn(),
  checkOrderStatusApi: vi.fn(),
}));

vi.mock('./pixelService', () => ({
  trackPixelPurchase: vi.fn(),
}));

describe('CheckoutUpsellPage - Página de UpSell & Downsell Pós-Compra com 1-Click', () => {
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
        enable_downsell: true,
        downsell_title: 'E-book Guia de Bolso Astrológico',
        downsell_subtitle: 'Versão rápida e prática para iniciantes',
        downsell_description: 'Todo o conteúdo resumido em formato digital.',
        downsell_price_brl: 47.0,
      },
    ],
  };

  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('exibe tela de carregamento e depois os dados da oferta de UpSell', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce(mockProduct);

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    expect(screen.getByTestId('upsell-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('checkout-upsell-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('upsell-offer-title')).toHaveTextContent('Mentoria Exclusiva de Acompanhamento');
    expect(screen.getByTestId('upsell-offer-subtitle')).toHaveTextContent('Apenas nesta oportunidade de checkout');
    expect(screen.getByTestId('upsell-offer-price')).toHaveTextContent('R$ 197,00');
    expect(screen.getByTestId('accept-upsell-btn')).toBeInTheDocument();
    expect(screen.getByTestId('decline-upsell-btn')).toBeInTheDocument();
  });

  it('processa compra em 1 clique com cartão de crédito e confirmação direta', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce(mockProduct);
    checkoutApi.fetchOrderByCodeApi.mockResolvedValueOnce({
      order_code: 'ORD-20261017-CC',
      payment_method: 'credit_card',
      status: 'paid',
    });
    checkoutApi.executeOneClickBuyApi.mockResolvedValueOnce({
      success: true,
      status: 'paid',
      order_code: 'ORD-20261017-CC-UP',
      amount_brl: 197.0,
      payment_method: 'credit_card',
    });

    // Simula parâmetro ?order_code=ORD-20261017-CC
    delete window.location;
    window.location = new URL('http://localhost/upsell/bussola-astrologica?order_code=ORD-20261017-CC');

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    await waitFor(() => {
      expect(screen.getByTestId('accept-upsell-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('accept-upsell-btn'));

    await waitFor(() => {
      expect(checkoutApi.executeOneClickBuyApi).toHaveBeenCalledWith(
        expect.objectContaining({
          order_code: 'ORD-20261017-CC',
          offer_type: 'upsell',
        })
      );
      expect(screen.getByTestId('upsell-result-screen')).toBeInTheDocument();
      expect(screen.getByText(/Oferta Confirmada com Sucesso!/i)).toBeInTheDocument();
    });

    expect(pixelService.trackPixelPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        order_code: 'ORD-20261017-CC-UP',
        amount_brl: 197.0,
      }),
      mockProduct
    );
  });

  it('abre modal instantâneo de Pix para compradores Pix (Opção A)', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce(mockProduct);
    checkoutApi.fetchOrderByCodeApi.mockResolvedValueOnce({
      order_code: 'ORD-20261017-PIX',
      payment_method: 'pix',
      status: 'paid',
    });
    checkoutApi.executeOneClickBuyApi.mockResolvedValueOnce({
      success: true,
      status: 'pending',
      order_code: 'ORD-20261017-PIX-UP',
      amount_brl: 197.0,
      payment_method: 'pix',
      qr_code_base64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      qr_code_text: '00020126580014br.gov.bcb.pix...',
    });

    delete window.location;
    window.location = new URL('http://localhost/upsell/bussola-astrologica?order_code=ORD-20261017-PIX');

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    await waitFor(() => {
      expect(screen.getByTestId('accept-upsell-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('accept-upsell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('upsell-pix-modal-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('btn-copy-upsell-pix')).toBeInTheDocument();
      expect(screen.getByTestId('upsell-pix-qr-image')).toBeInTheDocument();
    });
  });

  it('transiciona para Downsell quando comprador recusa UpSell e downsell está ativo', async () => {
    checkoutApi.fetchPublicProductApi.mockResolvedValueOnce(mockProduct);

    delete window.location;
    window.location = new URL('http://localhost/upsell/bussola-astrologica?order_code=ORD-20261017-TEST');

    render(<CheckoutUpsellPage slug="bussola-astrologica" />);

    await waitFor(() => {
      expect(screen.getByTestId('decline-upsell-btn')).toBeInTheDocument();
    });

    // Clica em recusar o UpSell
    fireEvent.click(screen.getByTestId('decline-upsell-btn'));

    // Deve transicionar para Downsell!
    await waitFor(() => {
      expect(screen.getByTestId('upsell-offer-title')).toHaveTextContent('E-book Guia de Bolso Astrológico');
      expect(screen.getByTestId('upsell-offer-price')).toHaveTextContent('R$ 47,00');
    });

    // Agora recusa também o Downsell
    fireEvent.click(screen.getByTestId('decline-upsell-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('upsell-result-screen')).toBeInTheDocument();
      expect(screen.getByText('Pedido Principal Confirmado!')).toBeInTheDocument();
    });
  });

  it('redireciona para external_url ao aceitar oferta quando configurada', async () => {
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
  });
});
