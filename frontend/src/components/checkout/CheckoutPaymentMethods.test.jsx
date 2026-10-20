import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import CheckoutPaymentMethods from './CheckoutPaymentMethods';

describe('CheckoutPaymentMethods - Abas e Métodos de Pagamento', () => {
  const defaultProps = {
    paymentMethod: 'pix',
    onSelectMethod: vi.fn(),
    cardData: {},
    onCardChange: vi.fn(),
    cryptoData: {},
    onCryptoChange: vi.fn(),
    hybridData: {
      pixAmount: 200,
      cardAmount: 300,
      card2Amount: 250,
      cardData: {},
      card2Data: {}
    },
    onHybridChange: vi.fn(),
    totalPriceBrl: 500,
    errors: {}
  };

  it('renderiza todas as abas de pagamento: Pix, Cartão, Cripto, Pix + Cartão e 2 Cartões', () => {
    render(<CheckoutPaymentMethods {...defaultProps} />);

    expect(screen.getByTestId('tab-payment-pix')).toBeInTheDocument();
    expect(screen.getByTestId('tab-payment-card')).toBeInTheDocument();
    expect(screen.getByTestId('tab-payment-crypto')).toBeInTheDocument();
    expect(screen.getByTestId('tab-payment-hybrid-pix-card')).toBeInTheDocument();
    expect(screen.getByTestId('tab-payment-hybrid-two-cards')).toBeInTheDocument();
  });

  it('chama onSelectMethod com hybrid_pix_card ao clicar na aba Pix + Cartão', () => {
    const onSelectMethod = vi.fn();
    render(<CheckoutPaymentMethods {...defaultProps} onSelectMethod={onSelectMethod} />);

    fireEvent.click(screen.getByTestId('tab-payment-hybrid-pix-card'));
    expect(onSelectMethod).toHaveBeenCalledWith('hybrid_pix_card');
  });

  it('chama onSelectMethod com hybrid_two_cards ao clicar na aba 2 Cartões', () => {
    const onSelectMethod = vi.fn();
    render(<CheckoutPaymentMethods {...defaultProps} onSelectMethod={onSelectMethod} />);

    fireEvent.click(screen.getByTestId('tab-payment-hybrid-two-cards'));
    expect(onSelectMethod).toHaveBeenCalledWith('hybrid_two_cards');
  });

  it('renderiza o formulário híbrido quando o método selecionado for hybrid_pix_card', () => {
    render(<CheckoutPaymentMethods {...defaultProps} paymentMethod="hybrid_pix_card" />);

    expect(screen.getByTestId('payment-content-hybrid')).toBeInTheDocument();
    expect(screen.getByTestId('input-hybrid-pix-amount')).toBeInTheDocument();
    expect(screen.getByTestId('input-hybrid-card-amount')).toBeInTheDocument();
  });

  it('renderiza badge e banner de desconto no Pix quando pixDiscountPercent > 0', () => {
    render(<CheckoutPaymentMethods {...defaultProps} pixDiscountPercent={10} paymentMethod="pix" />);

    expect(screen.getByTestId('pix-discount-badge')).toHaveTextContent('🔥 10% OFF');
    expect(screen.getByTestId('pix-discount-applied-banner')).toHaveTextContent('Desconto exclusivo de 10% aplicado no Pix!');
  });

  it('renderiza badge e banner de desconto em Cripto quando cryptoDiscountPercent > 0', () => {
    render(<CheckoutPaymentMethods {...defaultProps} cryptoDiscountPercent={15} paymentMethod="crypto" />);

    expect(screen.getByTestId('crypto-discount-badge')).toHaveTextContent('⚡ 15% OFF');
    expect(screen.getByTestId('crypto-discount-applied-banner')).toHaveTextContent('Desconto especial de 15% aplicado no pagamento em Cripto!');
  });

  it('renderiza opções de parcelamento respeitando maxInstallments e freeInstallmentsCount', () => {
    render(
      <CheckoutPaymentMethods
        {...defaultProps}
        paymentMethod="credit_card"
        maxInstallments={6}
        freeInstallmentsCount={2}
        interestRatePercent={2.99}
        interestPayer="buyer"
      />
    );

    const select = screen.getByTestId('select-card-installments');
    expect(select).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(6);
    expect(options[0]).toHaveTextContent('1x de R$ 500,00 à vista');
    expect(options[1]).toHaveTextContent('2x de R$ 250,00 sem juros');
    expect(options[2]).toHaveTextContent('3x de');
    expect(options[2]).toHaveTextContent('total:');
  });

  it('renderiza a aba de Boleto Parcelado (Asaas) quando o produto tiver enable_asaas_installments', () => {
    const onSelectMethod = vi.fn();
    render(
      <CheckoutPaymentMethods
        {...defaultProps}
        product={{ enable_asaas_installments: true, asaas_max_installments: 12 }}
        onSelectMethod={onSelectMethod}
      />
    );

    const asaasTab = screen.getByTestId('tab-payment-asaas-carnet');
    expect(asaasTab).toBeInTheDocument();
    expect(asaasTab).toHaveTextContent('Boleto Parcelado');

    fireEvent.click(asaasTab);
    expect(onSelectMethod).toHaveBeenCalledWith('asaas_installments');
  });

  it('renderiza o formulário de carnê Asaas quando paymentMethod for asaas_installments', () => {
    render(
      <CheckoutPaymentMethods
        {...defaultProps}
        paymentMethod="asaas_installments"
        product={{ enable_asaas_installments: true, asaas_max_installments: 10 }}
      />
    );

    expect(screen.getByTestId('payment-content-asaas-carnet')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-asaas-installment-form')).toBeInTheDocument();
  });

  it('desabilita e bloqueia as outras formas de pagamento quando allowedPaymentMethod for hybrid_pix_card', () => {
    const onSelectMethod = vi.fn();
    render(
      <CheckoutPaymentMethods
        {...defaultProps}
        paymentMethod="hybrid_pix_card"
        allowedPaymentMethod="hybrid_pix_card"
        onSelectMethod={onSelectMethod}
      />
    );

    // Mensagem de aviso presente
    expect(screen.getByText(/Forma de pagamento fixada na proposta personalizada/i)).toBeInTheDocument();

    // Aba hybrid_pix_card deve estar habilitada e ativa
    const hybridTab = screen.getByTestId('tab-payment-hybrid-pix-card');
    expect(hybridTab).not.toBeDisabled();
    expect(hybridTab).toHaveClass('active');
    expect(hybridTab).toHaveTextContent('Fixo na Proposta');

    // Demais abas devem estar desabilitadas, com classe disabled-proposal e texto Indisponível
    const pixTab = screen.getByTestId('tab-payment-pix');
    const cardTab = screen.getByTestId('tab-payment-card');
    const cryptoTab = screen.getByTestId('tab-payment-crypto');
    const twoCardsTab = screen.getByTestId('tab-payment-hybrid-two-cards');

    expect(pixTab).toBeDisabled();
    expect(pixTab).toHaveClass('disabled-proposal');
    expect(pixTab).toHaveTextContent('Indisponível');

    expect(cardTab).toBeDisabled();
    expect(cardTab).toHaveClass('disabled-proposal');

    expect(cryptoTab).toBeDisabled();
    expect(cryptoTab).toHaveClass('disabled-proposal');

    expect(twoCardsTab).toBeDisabled();
    expect(twoCardsTab).toHaveClass('disabled-proposal');

    // Clicar em abas desabilitadas NÃO deve chamar onSelectMethod
    fireEvent.click(pixTab);
    fireEvent.click(cardTab);
    expect(onSelectMethod).not.toHaveBeenCalled();
  });

  it('permite todos os métodos normalmente quando allowedPaymentMethod for "all"', () => {
    const onSelectMethod = vi.fn();
    render(
      <CheckoutPaymentMethods
        {...defaultProps}
        paymentMethod="pix"
        allowedPaymentMethod="all"
        onSelectMethod={onSelectMethod}
      />
    );

    const pixTab = screen.getByTestId('tab-payment-pix');
    const cardTab = screen.getByTestId('tab-payment-card');

    expect(pixTab).not.toBeDisabled();
    expect(cardTab).not.toBeDisabled();

    fireEvent.click(cardTab);
    expect(onSelectMethod).toHaveBeenCalledWith('credit_card');
  });
});


