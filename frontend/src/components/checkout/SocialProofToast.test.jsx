import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SocialProofToast from './SocialProofToast';
import * as productApi from '../product-management/productApi';

vi.mock('../product-management/productApi', () => ({
  fetchPublicSocialProofApi: vi.fn(),
}));

describe('SocialProofToast - Notificações de Prova Social', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando enabled é false', () => {
    const { container } = render(
      <SocialProofToast slug="mentoria-pro" enabled={false} />
    );
    expect(container.firstChild).toBeNull();
    expect(productApi.fetchPublicSocialProofApi).not.toHaveBeenCalled();
  });

  it('carrega e exibe notificação de compra recente após delay', async () => {
    productApi.fetchPublicSocialProofApi.mockResolvedValueOnce([
      {
        customer_name: 'Lucas M.',
        city: 'São Paulo',
        state: 'SP',
        payment_method: 'Pix',
        time_ago: 'há 2 min',
      },
    ]);

    render(<SocialProofToast slug="mentoria-pro" enabled={true} initialDelayMs={50} />);

    expect(productApi.fetchPublicSocialProofApi).toHaveBeenCalledWith('mentoria-pro');

    // Aguarda exibição do toast
    await waitFor(
      () => {
        expect(screen.getByTestId('social-proof-toast')).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    expect(screen.getByTestId('social-proof-customer-name')).toHaveTextContent('Lucas M.');
    expect(screen.getByText(/São Paulo - SP/i)).toBeInTheDocument();
    expect(screen.getByText(/Pix/i)).toBeInTheDocument();
    expect(screen.getByTestId('social-proof-time-ago')).toHaveTextContent('há 2 min');
  });

  it('permite dispensar o toast ao clicar no botão fechar (X)', async () => {
    productApi.fetchPublicSocialProofApi.mockResolvedValueOnce([
      {
        customer_name: 'Mariana S.',
        city: 'Rio de Janeiro',
        state: 'RJ',
        payment_method: 'Cartão de Crédito',
        time_ago: 'há 4 min',
      },
    ]);

    render(<SocialProofToast slug="mentoria-pro" enabled={true} initialDelayMs={50} />);

    await waitFor(
      () => {
        expect(screen.getByTestId('social-proof-toast')).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    fireEvent.click(screen.getByTestId('close-social-proof-toast'));

    expect(screen.queryByTestId('social-proof-toast')).not.toBeInTheDocument();
  });
});
