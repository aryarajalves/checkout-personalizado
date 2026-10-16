import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutCryptoPayment from './CheckoutCryptoPayment';
import * as checkoutApi from './checkoutApi';
import * as metamaskUtils from './metamaskUtils';

vi.mock('./checkoutApi', () => ({
  checkOrderStatusApi: vi.fn(),
  simulatePaymentApi: vi.fn(),
  confirmWeb3PaymentApi: vi.fn(),
}));

vi.mock('./metamaskUtils', () => ({
  payWithMetaMask: vi.fn(),
  isMetaMaskInstalled: vi.fn(() => false),
}));

describe('CheckoutCryptoPayment - Tela de Pagamento em Criptomoeda / MetaMask', () => {
  const mockOrder = {
    order_id: 88,
    order_code: 'ORD-CRYPTO-999',
    status: 'pending',
    amount_brl: 100.0,
    amount_usd: 20.0,
    crypto_amount: 20.0,
    crypto_currency: 'USDT',
    crypto_network: 'Polygon',
    crypto_wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
    qr_code_base64: 'data:image/png;base64,mockqrbase64',
    external_transaction_id: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza a tela limpa com os dados do pedido, moeda e rede', () => {
    render(<CheckoutCryptoPayment order={mockOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    expect(screen.getByTestId('crypto-payment-container')).toBeInTheDocument();
    expect(screen.getByText('Pedido: ORD-CRYPTO-999')).toBeInTheDocument();
    expect(screen.getAllByText('20 USDT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('crypto-network-alert')).toHaveTextContent('Polygon');
    expect(screen.getByTestId('crypto-qr-image')).toBeInTheDocument();
    expect(screen.getByTestId('crypto-wallet-input')).toHaveValue(mockOrder.crypto_wallet_address);
    expect(screen.getByTestId('crypto-copy-button')).toBeInTheDocument();
  });

  it('aciona o botão voltar corretamente', () => {
    const onBackMock = vi.fn();
    render(<CheckoutCryptoPayment order={mockOrder} onBack={onBackMock} onOrderPaid={vi.fn()} />);

    const backBtn = screen.getByRole('button', { name: /voltar/i });
    fireEvent.click(backBtn);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('permite copiar o endereço da carteira manual', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(true),
      },
    });

    render(<CheckoutCryptoPayment order={mockOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    const copyBtn = screen.getByTestId('crypto-copy-button');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockOrder.crypto_wallet_address);
    await waitFor(() => {
      expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });
  });

  it('simula confirmação de pagamento em ambiente sandbox com sucesso', async () => {
    const onOrderPaidMock = vi.fn();
    vi.spyOn(checkoutApi, 'simulatePaymentApi').mockResolvedValueOnce({
      order_id: 88,
      status: 'paid',
      order_code: 'ORD-CRYPTO-999',
      crypto_amount: 20.0,
      crypto_currency: 'USDT',
      crypto_network: 'Polygon',
    });

    render(<CheckoutCryptoPayment order={mockOrder} onBack={vi.fn()} onOrderPaid={onOrderPaidMock} />);

    const simBtn = screen.getByTestId('crypto-simulate-button');
    fireEvent.click(simBtn);

    await waitFor(() => {
      expect(checkoutApi.simulatePaymentApi).toHaveBeenCalledWith(88);
      expect(onOrderPaidMock).toHaveBeenCalled();
      expect(screen.getByTestId('crypto-success-screen')).toBeInTheDocument();
    });
  });

  it('exibe tela de sucesso quando o pedido já está pago', () => {
    const paidOrder = { ...mockOrder, status: 'paid' };
    render(<CheckoutCryptoPayment order={paidOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    expect(screen.getByTestId('crypto-success-screen')).toBeInTheDocument();
    expect(screen.getByText(/Pagamento Cripto Confirmado!/i)).toBeInTheDocument();
    expect(screen.getByText('ORD-CRYPTO-999')).toBeInTheDocument();
  });

  it('exibe mensagem de erro caso o pagamento com MetaMask falhe', async () => {
    vi.spyOn(metamaskUtils, 'payWithMetaMask').mockRejectedValueOnce(
      new Error('Usuário rejeitou a transação na MetaMask')
    );

    render(<CheckoutCryptoPayment order={mockOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    const metaMaskBtn = screen.getByTestId('crypto-metamask-button');
    fireEvent.click(metaMaskBtn);

    await waitFor(() => {
      expect(screen.getByTestId('crypto-metamask-error')).toHaveTextContent(
        'Usuário rejeitou a transação na MetaMask'
      );
    });
  });
});
