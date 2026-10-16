import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutPage from './CheckoutPage';
import * as checkoutApi from './checkoutApi';
import {
  maskCpf,
  maskPhone,
  maskCardNumber,
  maskCardExpiry,
  validateEmail,
  validateCpf,
  formatCurrency,
} from './checkoutUtils';

describe('Checkout Utilities', () => {
  it('correctly applies masks and validations', () => {
    expect(maskCpf('12345678909')).toBe('123.456.789-09');
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
    expect(maskCardNumber('1234567812345678')).toBe('1234 5678 1234 5678');
    expect(maskCardExpiry('1228')).toBe('12/28');

    expect(validateEmail('test@checkout.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);

    expect(validateCpf('11111111111')).toBe(false);
    expect(validateCpf('12345678900')).toBe(false);
    expect(validateCpf('52998224725')).toBe(true);

    expect(formatCurrency(150, 'BRL')).toContain('150');
    expect(formatCurrency(30, 'USD')).toContain('30');
  });
});

describe('CheckoutPage Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Curso de Cripto Pro',
    slug: 'curso-cripto-pro',
    description: 'Aprenda DeFi e Criptomoedas do Zero ao Avançado.',
    image_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=120',
    price_brl: 97.00,
    price_usd: 20.00,
    is_active: true,
    require_cpf: false,
    payment_methods: 'all',
    offers: [
      {
        id: 10,
        product_id: 1,
        name: 'Plano Anual VIP',
        slug: 'plano-anual-vip',
        price_brl: 197.00,
        price_usd: 40.00,
        is_default: true,
        is_active: true,
      },
    ],
  };

  const mockPixOrder = {
    order_id: 101,
    order_code: 'ORD-TEST-101',
    product_id: 1,
    customer_name: 'Maria Sem CPF',
    customer_email: 'maria@semcpf.com',
    customer_phone: '11988887777',
    customer_cpf: null,
    amount_brl: 197.0,
    amount_usd: 40.0,
    payment_method: 'pix',
    status: 'pending',
    qr_code_base64: 'data:image/svg+xml;utf8,<svg>mock</svg>',
    qr_code_text: '00020126580014br.gov.bcb.pix0136test-emv-payload',
    splits: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders loading state and then displays product details and order summary', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);

    render(<CheckoutPage slug="plano-anual-vip" />);

    expect(screen.getByTestId('checkout-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();
    expect(screen.getByText('Curso de Cripto Pro')).toBeInTheDocument();
    expect(screen.getByText(/Oferta: Plano Anual VIP/i)).toBeInTheDocument();
    expect(screen.getByTestId('checkout-total-price')).toHaveTextContent(/197/);
  });

  it('shows error screen if product fetch fails', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockRejectedValue(
      new Error('Produto ou oferta não encontrada.')
    );

    render(<CheckoutPage slug="slug-inexistente" />);

    expect(await screen.findByTestId('checkout-error')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Oferta não encontrada/i })).toBeInTheDocument();
  });

  it('does NOT display CPF field when require_cpf is false and submits Pix payment successfully', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);
    const processSpy = vi.spyOn(checkoutApi, 'processCheckoutApi').mockResolvedValue(mockPixOrder);
    const simulateSpy = vi.spyOn(checkoutApi, 'simulatePaymentApi').mockResolvedValue({
      order_id: 101,
      order_code: 'ORD-TEST-101',
      status: 'paid',
      customer_name: 'Maria Sem CPF',
      product_name: 'Curso de Cripto Pro',
      amount_brl: 197.0,
    });

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    // CPF não deve estar na tela quando require_cpf = false
    expect(screen.queryByTestId('checkout-input-cpf')).not.toBeInTheDocument();

    // Preenche Dados do Cliente
    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Maria Sem CPF' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'maria@semcpf.com' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '11988887777' } });

    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    // Verifica que processCheckoutApi foi chamado com slug e dados corretos (sem CPF)
    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Maria Sem CPF',
          email: 'maria@semcpf.com',
          phone: '(11) 98888-7777',
          cpf: null,
          payment_method: 'pix',
        })
      );
    });

    // Deve transicionar para a tela de pagamento Pix com QR Code e Copia e Cola
    expect(await screen.findByTestId('pix-payment-container')).toBeInTheDocument();
    expect(screen.getByTestId('pix-qr-image')).toBeInTheDocument();
    expect(screen.getByTestId('pix-copiacola-input')).toHaveValue(mockPixOrder.qr_code_text);

    // Testa botão de copiar código Pix
    const copyBtn = screen.getByTestId('pix-copy-button');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPixOrder.qr_code_text);

    // Simula liquidação do Pix (botão Sandbox)
    const simBtn = screen.getByTestId('pix-simulate-button');
    fireEvent.click(simBtn);

    await waitFor(() => {
      expect(simulateSpy).toHaveBeenCalledWith(101);
      expect(screen.getByTestId('pix-success-screen')).toBeInTheDocument();
    });

    expect(screen.getByText(/Pagamento Confirmado/i)).toBeInTheDocument();
  });

  it('displays and validates CPF field when require_cpf is true', async () => {
    const productWithCpf = { ...mockProduct, require_cpf: true };
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(productWithCpf);
    const processSpy = vi.spyOn(checkoutApi, 'processCheckoutApi').mockResolvedValue({
      ...mockPixOrder,
      customer_cpf: '52998224725',
    });

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    const cpfInput = screen.getByTestId('checkout-input-cpf');
    expect(cpfInput).toBeInTheDocument();

    // Preenche dados mas omite CPF
    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Ana Com CPF' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'ana@comcpf.com' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '11977776666' } });

    fireEvent.click(screen.getByTestId('checkout-submit-button'));
    expect(await screen.findByText(/Informe um CPF válido/i)).toBeInTheDocument();

    // Preenche com CPF válido e submete
    fireEvent.change(cpfInput, { target: { value: '52998224725' } });
    expect(cpfInput.value).toBe('529.982.247-25');

    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cpf: '529.982.247-25',
        })
      );
    });
  });

  it('switches payment methods and handles credit card checkout', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);
    const processSpy = vi.spyOn(checkoutApi, 'processCheckoutApi').mockResolvedValue({
      order_id: 102,
      order_code: 'ORD-CARD-102',
      product_id: 1,
      payment_method: 'credit_card',
      amount_brl: 197.0,
      amount_usd: 40.0,
      status: 'paid',
    });

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    // Seleciona aba Cartão
    fireEvent.click(screen.getByTestId('tab-payment-card'));
    expect(screen.getByTestId('payment-content-card')).toBeInTheDocument();

    // Preenche dados pessoais
    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Carlos Cartao' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'carlos@cartao.com' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '11999998888' } });

    // Preenche cartão
    fireEvent.change(screen.getByTestId('input-card-number'), { target: { value: '4111111111111111' } });
    fireEvent.change(screen.getByTestId('input-card-holder'), { target: { value: 'CARLOS SILVA' } });
    fireEvent.change(screen.getByTestId('input-card-expiry'), { target: { value: '1228' } });
    fireEvent.change(screen.getByTestId('input-card-cvv'), { target: { value: '123' } });

    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'credit_card',
          card_number: '4111 1111 1111 1111',
          card_holder: 'CARLOS SILVA',
          card_expiry: '12/28',
          card_cvv: '123',
        })
      );
      expect(screen.getByTestId('checkout-success-banner')).toBeInTheDocument();
      expect(screen.getByTestId('auto-redirect-badge')).toHaveTextContent(/Redirecionando/i);
    });

    expect(screen.getByText(/ORD-CARD-102/i)).toBeInTheDocument();
  });

  it('displays submission error message if checkout process API fails', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);
    vi.spyOn(checkoutApi, 'processCheckoutApi').mockRejectedValue(
      new Error('Saldo insuficiente ou gateway indisponível.')
    );

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Cliente Teste' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'cliente@teste.com' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '11988889999' } });

    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    expect(await screen.findByTestId('checkout-submit-error')).toBeInTheDocument();
    expect(screen.getByText(/Saldo insuficiente ou gateway indisponível/i)).toBeInTheDocument();
  });

  it('processes cryptocurrency checkout and renders crypto payment screen with wallet copy and simulation', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);
    const mockCryptoOrder = {
      order_id: 103,
      order_code: 'ORD-CRYPTO-103',
      product_id: 1,
      customer_name: 'Ana Cripto',
      payment_method: 'crypto',
      amount_brl: 197.0,
      amount_usd: 40.0,
      crypto_amount: 40.0,
      crypto_currency: 'USDT',
      crypto_network: 'Polygon',
      crypto_wallet_address: '0x71C845137c7291779C308727617326889493f0bB',
      qr_code_base64: 'data:image/svg+xml;utf8,<svg>crypto-mock-qr</svg>',
      status: 'pending',
    };
    const processSpy = vi.spyOn(checkoutApi, 'processCheckoutApi').mockResolvedValue(mockCryptoOrder);
    const simulateSpy = vi.spyOn(checkoutApi, 'simulatePaymentApi').mockResolvedValue({
      order_id: 103,
      order_code: 'ORD-CRYPTO-103',
      status: 'paid',
      customer_name: 'Ana Cripto',
      product_name: 'Curso de Cripto Pro',
      amount_brl: 197.0,
      amount_usd: 40.0,
    });

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    // Seleciona Cripto
    fireEvent.click(screen.getByTestId('tab-payment-crypto'));
    expect(screen.getByTestId('payment-content-crypto')).toBeInTheDocument();

    // Preenche dados pessoais
    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Ana Cripto' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'ana@cripto.com' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '11988884444' } });

    // Submete compra
    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'crypto',
          crypto_currency: 'USDT',
          crypto_network: 'polygon',
        })
      );
    });

    // Tela de pagamento Cripto
    expect(await screen.findByTestId('crypto-payment-container')).toBeInTheDocument();
    expect(screen.getByTestId('crypto-network-alert')).toHaveTextContent(/Polygon/i);
    expect(screen.getByTestId('crypto-wallet-input')).toHaveValue('0x71C845137c7291779C308727617326889493f0bB');
    expect(screen.getByTestId('crypto-qr-image')).toBeInTheDocument();

    // Testa botão de copiar endereço da carteira
    const copyBtn = screen.getByTestId('crypto-copy-button');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0x71C845137c7291779C308727617326889493f0bB');

    // Simula confirmação na blockchain
    const simBtn = screen.getByTestId('crypto-simulate-button');
    fireEvent.click(simBtn);

    await waitFor(() => {
      expect(simulateSpy).toHaveBeenCalledWith(103);
      expect(screen.getByTestId('crypto-success-screen')).toBeInTheDocument();
    });

    expect(screen.getByText(/Pagamento Cripto Confirmado/i)).toBeInTheDocument();
  });

  it('connects to MetaMask (window.ethereum), switches chain, signs ERC-20 transfer and confirms payment', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);
    const mockCryptoOrder = {
      order_id: 104,
      order_code: 'ORD-METAMASK-104',
      product_id: 1,
      customer_name: 'Satoshi MetaMask',
      payment_method: 'crypto',
      amount_brl: 197.0,
      amount_usd: 40.0,
      crypto_amount: 40.0,
      crypto_currency: 'USDT',
      crypto_network: 'Polygon',
      crypto_wallet_address: '0x71C845137c7291779C308727617326889493f0bB',
      qr_code_base64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      status: 'pending',
    };
    vi.spyOn(checkoutApi, 'processCheckoutApi').mockResolvedValue(mockCryptoOrder);
    const confirmWeb3Spy = vi.spyOn(checkoutApi, 'confirmWeb3PaymentApi').mockResolvedValue({
      order_id: 104,
      order_code: 'ORD-METAMASK-104',
      status: 'paid',
      external_transaction_id: '0x999888777666555444333222111000aaabbbcccdddeeefff',
      customer_name: 'Satoshi MetaMask',
      product_name: 'Curso de Cripto Pro',
      amount_brl: 197.0,
      amount_usd: 40.0,
    });

    const mockEthereumRequest = vi.fn().mockImplementation(({ method }) => {
      if (method === 'eth_requestAccounts') {
        return Promise.resolve(['0x1234567890abcdef1234567890abcdef12345678']);
      }
      if (method === 'wallet_switchEthereumChain') {
        return Promise.resolve(null);
      }
      if (method === 'eth_sendTransaction') {
        return Promise.resolve('0x999888777666555444333222111000aaabbbcccdddeeefff');
      }
      return Promise.resolve(null);
    });
    window.ethereum = { request: mockEthereumRequest };

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    fireEvent.click(screen.getByTestId('tab-payment-crypto'));
    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Satoshi MetaMask' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'satoshi@metamask.io' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '11977771111' } });

    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    await waitFor(() => {
      expect(mockEthereumRequest).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
      expect(mockEthereumRequest).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }],
      });
      expect(mockEthereumRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'eth_sendTransaction',
        })
      );
      expect(confirmWeb3Spy).toHaveBeenCalledWith(
        104,
        '0x999888777666555444333222111000aaabbbcccdddeeefff',
        '0x1234567890abcdef1234567890abcdef12345678'
      );
      expect(screen.getByTestId('crypto-success-screen')).toBeInTheDocument();
    });

    expect(screen.getByTestId('crypto-tx-hash')).toBeInTheDocument();
    delete window.ethereum;
  });

  it('aplica logotipo do expert e cor primária personalizada no checkout', async () => {
    vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue({
      ...mockProduct,
      primary_color: '#7c3aed',
      logo_url: 'https://expert.com/logo-header.png',
    });

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    const logoImg = screen.getByTestId('checkout-brand-logo');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('src', 'https://expert.com/logo-header.png');

    const pageWrapper = screen.getByTestId('checkout-page');
    expect(pageWrapper).toHaveStyle({ '--checkout-primary': '#7c3aed' });
  });

  it('permite selecionar DDI internacional e envia phone_ddi no processamento do checkout', async () => {
    const processSpy = vi.spyOn(checkoutApi, 'processCheckoutApi').mockResolvedValue(mockPixOrder);

    render(<CheckoutPage slug="plano-anual-vip" />);
    await screen.findByTestId('checkout-page');

    // Abre seletor DDI e escolhe Portugal (+351)
    fireEvent.click(screen.getByTestId('checkout-ddi-button'));
    fireEvent.click(screen.getByTestId('checkout-ddi-option-351'));

    // Preenche dados do cliente com telefone de Portugal
    fireEvent.change(screen.getByTestId('checkout-input-name'), { target: { value: 'Comprador Portugal' } });
    fireEvent.change(screen.getByTestId('checkout-input-email'), { target: { value: 'pt@exemplo.com' } });
    fireEvent.change(screen.getByTestId('checkout-input-phone'), { target: { value: '912345678' } });

    fireEvent.click(screen.getByTestId('checkout-submit-button'));

    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Comprador Portugal',
          phone: '912345678',
          phone_ddi: '351',
        })
      );
    });
  });
});


