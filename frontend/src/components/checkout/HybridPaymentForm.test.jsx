import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import HybridPaymentForm from './HybridPaymentForm';

describe('HybridPaymentForm - Formulário de Pagamento Híbrido', () => {
  const defaultHybridData = {
    pixAmount: 250,
    cardAmount: 250,
    card2Amount: 250,
    cardData: {
      cardNumber: '4111 1111 1111 1111',
      cardHolder: 'JOAO SILVA',
      cardExpiry: '12/28',
      cardCvv: '123',
      installments: 3
    },
    card2Data: {
      cardNumber: '5555 4444 3333 2222',
      cardHolder: 'JOAO SILVA 2',
      cardExpiry: '08/29',
      cardCvv: '456',
      installments: 2
    }
  };

  it('renderiza corretamente a opção Pix + Cartão com presets e inputs', () => {
    const onHybridChange = vi.fn();
    render(
      <HybridPaymentForm
        paymentMethod="hybrid_pix_card"
        totalPriceBrl={500}
        hybridData={defaultHybridData}
        onHybridChange={onHybridChange}
      />
    );

    expect(screen.getByTestId('hybrid-payment-container')).toBeInTheDocument();
    expect(screen.getByText(/Defina a Divisão do Pagamento/i)).toBeInTheDocument();
    expect(screen.getByTestId('preset-50-50')).toBeInTheDocument();
    expect(screen.getByTestId('input-hybrid-pix-amount')).toHaveValue(250);
    expect(screen.getByTestId('input-hybrid-card-amount')).toHaveValue(250);
    expect(screen.getByTestId('input-hybrid-card-number')).toHaveValue('4111 1111 1111 1111');
    expect(screen.getByTestId('select-hybrid-card-installments')).toBeInTheDocument();
  });

  it('permite aplicar presets percentuais de divisão (ex: 30% Pix / 70% Cartão)', () => {
    const onHybridChange = vi.fn();
    render(
      <HybridPaymentForm
        paymentMethod="hybrid_pix_card"
        totalPriceBrl={500}
        hybridData={defaultHybridData}
        onHybridChange={onHybridChange}
      />
    );

    fireEvent.click(screen.getByTestId('preset-30-70'));
    expect(onHybridChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pixAmount: 150,
        cardAmount: 350
      })
    );
  });

  it('permite alterar o valor do Pix e recalcula o restante do Cartão', () => {
    const onHybridChange = vi.fn();
    render(
      <HybridPaymentForm
        paymentMethod="hybrid_pix_card"
        totalPriceBrl={500}
        hybridData={defaultHybridData}
        onHybridChange={onHybridChange}
      />
    );

    const pixInput = screen.getByTestId('input-hybrid-pix-amount');
    fireEvent.change(pixInput, { target: { value: '100' } });

    expect(onHybridChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pixAmount: 100,
        cardAmount: 400
      })
    );
  });

  it('renderiza os formulários de 2 Cartões de Crédito quando paymentMethod é hybrid_two_cards', () => {
    const onHybridChange = vi.fn();
    render(
      <HybridPaymentForm
        paymentMethod="hybrid_two_cards"
        totalPriceBrl={600}
        hybridData={defaultHybridData}
        onHybridChange={onHybridChange}
      />
    );

    expect(screen.getByTestId('input-hybrid-card1-amount')).toBeInTheDocument();
    expect(screen.getByTestId('input-hybrid-card2-amount')).toBeInTheDocument();
    expect(screen.getByTestId('input-hybrid-card-number')).toBeInTheDocument();
    expect(screen.getByTestId('input-hybrid-card2-number')).toBeInTheDocument();
    expect(screen.getByTestId('input-hybrid-card2-holder')).toHaveValue('JOAO SILVA 2');
  });

  it('exibe erros de validação passados via props', () => {
    const errors = {
      cardNumber: 'Número de cartão inválido.',
      card2Number: 'Número do cartão 2 inválido.'
    };

    render(
      <HybridPaymentForm
        paymentMethod="hybrid_two_cards"
        totalPriceBrl={600}
        hybridData={defaultHybridData}
        onHybridChange={vi.fn()}
        errors={errors}
      />
    );

    expect(screen.getByText('Número de cartão inválido.')).toBeInTheDocument();
    expect(screen.getByText('Número do cartão 2 inválido.')).toBeInTheDocument();
  });
});
