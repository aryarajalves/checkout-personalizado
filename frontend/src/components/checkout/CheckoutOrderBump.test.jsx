import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import CheckoutOrderBump from './CheckoutOrderBump';

describe('CheckoutOrderBump - Componente de Ofertas no Checkout', () => {
  const mockBumps = [
    {
      id: 101,
      title: 'Ebook Complementar VIP',
      description: 'Guia passo a passo com checklists práticos.',
      price_brl: 27.0,
      is_active: true,
    },
    {
      id: 102,
      title: 'Acesso à Comunidade Secreta',
      description: 'Networking exclusivo com outros membros.',
      price_brl: 47.0,
      is_active: true,
    },
    {
      id: 103,
      title: 'Oferta Desativada',
      description: 'Não deve aparecer',
      price_brl: 99.0,
      is_active: false,
    },
  ];

  it('não renderiza nada se não houver bumps ativos', () => {
    const { container } = render(
      <CheckoutOrderBump bumps={[]} selectedBumpIds={[]} onToggleBump={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza se houver apenas bumps inativos', () => {
    const { container } = render(
      <CheckoutOrderBump bumps={[mockBumps[2]]} selectedBumpIds={[]} onToggleBump={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza os bumps ativos com título, descrição e preço formatado', () => {
    render(
      <CheckoutOrderBump
        bumps={mockBumps}
        selectedBumpIds={[]}
        onToggleBump={vi.fn()}
      />
    );

    expect(screen.getByText('Turbine seu Pedido (Ofertas Especiais)')).toBeInTheDocument();
    expect(screen.getByText('Ebook Complementar VIP')).toBeInTheDocument();
    expect(screen.getByText('Guia passo a passo com checklists práticos.')).toBeInTheDocument();
    expect(screen.getByText('+ R$ 27,00')).toBeInTheDocument();

    expect(screen.getByText('Acesso à Comunidade Secreta')).toBeInTheDocument();
    expect(screen.getByText('+ R$ 47,00')).toBeInTheDocument();

    // Inativo não deve constar
    expect(screen.queryByText('Oferta Desativada')).not.toBeInTheDocument();
  });

  it('dispara onToggleBump ao clicar no card da oferta', () => {
    const handleToggle = vi.fn();
    render(
      <CheckoutOrderBump
        bumps={mockBumps}
        selectedBumpIds={[]}
        onToggleBump={handleToggle}
      />
    );

    const card = screen.getByTestId('bump-card-101');
    fireEvent.click(card);

    expect(handleToggle).toHaveBeenCalledTimes(1);
    expect(handleToggle).toHaveBeenCalledWith(101);
  });

  it('exibe estilo selecionado quando o bump está em selectedBumpIds', () => {
    render(
      <CheckoutOrderBump
        bumps={mockBumps}
        selectedBumpIds={[101]}
        onToggleBump={vi.fn()}
      />
    );

    const cardSelected = screen.getByTestId('bump-card-101');
    expect(cardSelected.style.backgroundColor).toBe('rgb(240, 253, 244)');

    const cardUnselected = screen.getByTestId('bump-card-102');
    expect(cardUnselected.style.backgroundColor).toBe('rgb(248, 250, 252)');
  });
});
