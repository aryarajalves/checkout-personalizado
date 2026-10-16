import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import CheckoutThankYouPage from './CheckoutThankYouPage';
import * as checkoutApi from './checkoutApi';

vi.mock('./checkoutApi', () => ({
  fetchOrderByCodeApi: vi.fn(),
}));

describe('CheckoutThankYouPage - Página de Obrigado (Thank You Page)', () => {
  const mockOrderNative = {
    order_id: 1,
    order_code: 'ORD-20261016-ABC123',
    status: 'paid',
    customer_name: 'Guilherme Silveira',
    customer_email: 'guilherme@teste.com',
    customer_phone: '11999998888',
    customer_phone_ddi: '55',
    product_name: 'Formação Fullstack Pro',
    payment_method: 'pix',
    amount_brl: 297.0,
    amount_usd: null,
    thank_you_url: null, // Página padrão nativa
    has_upsell: false,
    upsell_url: null,
  };

  const mockOrderExternal = {
    order_id: 2,
    order_code: 'ORD-20261016-XYZ987',
    status: 'paid',
    customer_name: 'Mariana Duarte',
    customer_email: 'mariana@teste.com',
    customer_phone: '21988887777',
    customer_phone_ddi: '55',
    product_name: 'Mentoria Vip Exclusiva',
    payment_method: 'credit_card',
    amount_brl: 497.0,
    amount_usd: null,
    thank_you_url: 'https://membros.meusite.com/obrigado',
    has_upsell: false,
    upsell_url: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe tela de carregamento e depois a Página de Obrigado Padrão (nativa)', async () => {
    checkoutApi.fetchOrderByCodeApi.mockResolvedValueOnce(mockOrderNative);

    render(<CheckoutThankYouPage orderCode="ORD-20261016-ABC123" />);

    expect(screen.getByTestId('thank-you-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('checkout-thank-you-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('thank-you-badge')).toHaveTextContent('Pagamento Confirmado');
    expect(screen.getByText('Checkout Seguro')).toBeInTheDocument();
    expect(screen.getByText('ORD-20261016-ABC123')).toBeInTheDocument();
    expect(screen.getByText('Formação Fullstack Pro')).toBeInTheDocument();
    expect(screen.getByText('Guilherme Silveira')).toBeInTheDocument();
    expect(screen.getByText('R$ 297,00')).toBeInTheDocument();
    expect(screen.getByText(/Pix Instantâneo/i)).toBeInTheDocument();
    expect(screen.getByTestId('order-customer-email')).toHaveTextContent('guilherme@teste.com');

    // Garante que NENHUM aviso de envio de e-mail é exibido (regra de negócio definida pelo usuário)
    expect(screen.queryByText(/Acesso enviado por e-mail/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/caixa de entrada e spam/i)).not.toBeInTheDocument();

    // Não deve exibir box de redirecionamento quando thank_you_url é nulo
    expect(screen.queryByTestId('external-redirect-box')).not.toBeInTheDocument();
  });

  it('exibe box de redirecionamento inteligente com contagem e link parametrizado quando thank_you_url estiver preenchida', async () => {
    checkoutApi.fetchOrderByCodeApi.mockResolvedValueOnce(mockOrderExternal);

    render(<CheckoutThankYouPage orderCode="ORD-20261016-XYZ987" />);

    await waitFor(() => {
      expect(screen.getByTestId('checkout-thank-you-page')).toBeInTheDocument();
    });

    // Exibe o box de redirecionamento
    expect(screen.getByTestId('external-redirect-box')).toBeInTheDocument();
    expect(screen.getByText(/Redirecionando em 3 segundos/i)).toBeInTheDocument();

    // Botão de acesso imediato possui parâmetros corretos do comprador
    const redirectBtn = screen.getByTestId('immediate-redirect-btn');
    expect(redirectBtn).toBeInTheDocument();
    const href = redirectBtn.getAttribute('href');
    expect(href).toContain('order_id=ORD-20261016-XYZ987');
    expect(href).toContain('name=Mariana+Duarte');
    expect(href).toContain('email=mariana%40teste.com');
  });

  it('exibe tela de erro amigável quando o código do pedido for inválido ou não encontrado', async () => {
    checkoutApi.fetchOrderByCodeApi.mockRejectedValueOnce(new Error('Pedido com código informado não encontrado.'));

    render(<CheckoutThankYouPage orderCode="ORD-INVALIDO" />);

    await waitFor(() => {
      expect(screen.getByTestId('thank-you-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Pedido não encontrado')).toBeInTheDocument();
    expect(screen.getByText(/Pedido com código informado não encontrado/i)).toBeInTheDocument();
  });
});
