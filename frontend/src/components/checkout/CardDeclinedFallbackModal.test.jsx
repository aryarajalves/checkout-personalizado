import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CardDeclinedFallbackModal from './CardDeclinedFallbackModal';

describe('CardDeclinedFallbackModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onPayWithPix: vi.fn(),
    onPayWithHybrid: vi.fn(),
    onTryAnotherCard: vi.fn(),
    product: {
      name: 'Curso Expert',
      card_fallback_discount_percent: 10.0,
      pix_discount_percent: 0.0,
    },
    totalBrl: 200.0,
    submittingPix: false,
    declinedReason: 'Saldo insuficiente ou limite bloqueado pelo emissor.',
  };

  it('não deve renderizar quando isOpen for false', () => {
    const { container } = render(
      <CardDeclinedFallbackModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar modal com título, motivo e valores com desconto quando isOpen for true', () => {
    render(<CardDeclinedFallbackModal {...defaultProps} />);

    expect(screen.getByTestId('card-declined-fallback-modal')).toBeInTheDocument();
    expect(screen.getByText('Seu banco não autorizou o cartão')).toBeInTheDocument();
    expect(
      screen.getByText('Saldo insuficiente ou limite bloqueado pelo emissor.')
    ).toBeInTheDocument();

    // R$ 200 com 10% de desconto = R$ 180
    expect(screen.getByText(/10% OFF NO PIX/i)).toBeInTheDocument();
    expect(screen.getByText('R$ 180,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
  });

  it('deve acionar onPayWithPix ao clicar no botão de pagar via Pix', () => {
    const onPayWithPix = vi.fn();
    render(
      <CardDeclinedFallbackModal {...defaultProps} onPayWithPix={onPayWithPix} />
    );

    const payPixBtn = screen.getByTestId('fallback-pay-pix-btn');
    fireEvent.click(payPixBtn);
    expect(onPayWithPix).toHaveBeenCalledTimes(1);
  });

  it('deve acionar onPayWithHybrid ao clicar no botão de pagamento híbrido', () => {
    const onPayWithHybrid = vi.fn();
    render(
      <CardDeclinedFallbackModal
        {...defaultProps}
        onPayWithHybrid={onPayWithHybrid}
      />
    );

    const hybridBtn = screen.getByTestId('fallback-pay-hybrid-btn');
    fireEvent.click(hybridBtn);
    expect(onPayWithHybrid).toHaveBeenCalledTimes(1);
  });

  it('deve acionar onTryAnotherCard ao clicar no botão de trocar cartão', () => {
    const onTryAnotherCard = vi.fn();
    render(
      <CardDeclinedFallbackModal
        {...defaultProps}
        onTryAnotherCard={onTryAnotherCard}
      />
    );

    const tryCardBtn = screen.getByTestId('fallback-try-another-card-btn');
    fireEvent.click(tryCardBtn);
    expect(onTryAnotherCard).toHaveBeenCalledTimes(1);
  });

  it('deve acionar onClose ao clicar no botão único de fechar (X)', () => {
    const onClose = vi.fn();
    render(<CardDeclinedFallbackModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByTestId('close-fallback-modal-btn');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('NÃO deve fechar ao clicar no backdrop (regra de UX de popups)', () => {
    const onClose = vi.fn();
    render(<CardDeclinedFallbackModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('card-declined-fallback-modal');
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });
});
