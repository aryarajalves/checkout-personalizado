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
});
