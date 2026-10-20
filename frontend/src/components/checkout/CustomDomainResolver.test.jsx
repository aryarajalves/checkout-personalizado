import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CustomDomainResolver from './CustomDomainResolver';
import * as checkoutApi from './checkoutApi';

vi.mock('./checkoutApi', () => ({
  fetchPublicProductByDomainApi: vi.fn(),
  fetchPublicProductApi: vi.fn(),
  processCheckoutApi: vi.fn(),
}));

vi.mock('./CheckoutPage', () => ({
  default: ({ domain, slug }) => (
    <div data-testid="mocked-checkout-page">
      Checkout carregado para domínio: {domain || slug}
    </div>
  ),
}));

describe('CustomDomainResolver - Resolução de Whitelabel CNAME no Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe tela de fallback quando domínio não está cadastrado em nenhum produto', async () => {
    checkoutApi.fetchPublicProductByDomainApi.mockRejectedValueOnce(
      new Error('Produto não encontrado para este domínio.')
    );

    render(
      <CustomDomainResolver
        domain="desconhecido.com"
        fallback={<div data-testid="login-fallback">Tela de Login</div>}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-fallback')).toBeInTheDocument();
      expect(screen.getByText('Tela de Login')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('mocked-checkout-page')).not.toBeInTheDocument();
  });

  it('renderiza CheckoutPage quando o domínio é encontrado com sucesso', async () => {
    checkoutApi.fetchPublicProductByDomainApi.mockResolvedValueOnce({
      id: 1,
      name: 'Produto Whitelabel',
      slug: 'produto-whitelabel',
      custom_domain: 'pay.expert.com.br',
    });

    render(
      <CustomDomainResolver
        domain="pay.expert.com.br"
        fallback={<div data-testid="login-fallback">Tela de Login</div>}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('mocked-checkout-page')).toBeInTheDocument();
      expect(
        screen.getByText(/Checkout carregado para domínio: pay\.expert\.com\.br/)
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId('login-fallback')).not.toBeInTheDocument();
  });
});
