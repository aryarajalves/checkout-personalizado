import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ExitIntentModal from './ExitIntentModal';

describe('ExitIntentModal - Pop-up de Desconto ao Sair', () => {
  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ExitIntentModal
        isOpen={false}
        onClose={vi.fn()}
        onApplyDiscount={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza corretamente título, subtítulo e percentual de desconto', () => {
    render(
      <ExitIntentModal
        isOpen={true}
        onClose={vi.fn()}
        onApplyDiscount={vi.fn()}
        title="Espere! Não vá embora sem seu bônus"
        subtitle="Liberamos 15% de desconto imediato"
        couponCode="VOLTA15"
        discountPercent={15}
      />
    );

    expect(screen.getByTestId('exit-intent-title')).toHaveTextContent('Espere! Não vá embora sem seu bônus');
    expect(screen.getByTestId('exit-intent-subtitle')).toHaveTextContent('Liberamos 15% de desconto imediato');
    expect(screen.getByText(/15% DE DESCONTO EXCLUSIVO/i)).toBeInTheDocument();
    expect(screen.getByTestId('exit-intent-coupon-code')).toHaveTextContent('VOLTA15');
  });

  it('aplica desconto e fecha modal ao clicar no botão de ação principal', () => {
    const onApplyDiscount = vi.fn();
    const onClose = vi.fn();

    render(
      <ExitIntentModal
        isOpen={true}
        onClose={onClose}
        onApplyDiscount={onApplyDiscount}
        couponCode="DESCONTO20"
        discountPercent={20}
      />
    );

    const applyBtn = screen.getByTestId('apply-exit-intent-discount-btn');
    expect(applyBtn).toHaveTextContent(/SIM, QUERO MEU DESCONTO DE 20%/i);

    fireEvent.click(applyBtn);

    expect(onApplyDiscount).toHaveBeenCalledWith('DESCONTO20');
    expect(onClose).toHaveBeenCalled();
  });

  it('fecha o modal ao clicar no botão de cancelar', () => {
    const onClose = vi.fn();

    render(
      <ExitIntentModal
        isOpen={true}
        onClose={onClose}
        onApplyDiscount={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('reject-exit-intent-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('fecha o modal ao clicar no botão X', () => {
    const onClose = vi.fn();

    render(
      <ExitIntentModal
        isOpen={true}
        onClose={onClose}
        onApplyDiscount={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('close-exit-intent-btn'));
    expect(onClose).toHaveBeenCalled();
  });
});
