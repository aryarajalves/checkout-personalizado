import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import CheckoutCountdownBar from './CheckoutCountdownBar';

describe('CheckoutCountdownBar - Cronômetro de Escassez', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não renderiza nada quando enabled é false', () => {
    const { container } = render(
      <CheckoutCountdownBar enabled={false} minutes={15} productId={10} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza barra com mensagem e contador formatado quando enabled é true', () => {
    render(
      <CheckoutCountdownBar
        enabled={true}
        minutes={10}
        text="Seu desconto expira em:"
        productId={10}
      />
    );

    expect(screen.getByTestId('checkout-countdown-bar')).toBeInTheDocument();
    expect(screen.getByText('OFERTA LIMITADA')).toBeInTheDocument();
    expect(screen.getByText('Seu desconto expira em:')).toBeInTheDocument();
    expect(screen.getByTestId('countdown-clock-display')).toHaveTextContent('10:00');
  });

  it('reduz o tempo com o passar dos segundos', () => {
    render(
      <CheckoutCountdownBar
        enabled={true}
        minutes={10}
        productId={10}
      />
    );

    expect(screen.getByTestId('countdown-clock-display')).toHaveTextContent('10:00');

    act(() => {
      vi.advanceTimersByTime(2000); // 2 segundos
    });

    expect(screen.getByTestId('countdown-clock-display')).toHaveTextContent('09:58');
  });

  it('aplica classe is-expiring quando faltam menos de 2 minutos', () => {
    // Configura expiração em 60 segundos
    sessionStorage.setItem('checkout_timer_10', String(Date.now() + 60 * 1000));

    render(
      <CheckoutCountdownBar
        enabled={true}
        minutes={15}
        productId={10}
      />
    );

    const bar = screen.getByTestId('checkout-countdown-bar');
    expect(bar).toHaveClass('is-expiring');
  });
});
