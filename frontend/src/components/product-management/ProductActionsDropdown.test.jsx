import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ProductActionsDropdown from './ProductActionsDropdown';

describe('ProductActionsDropdown - Menu Suspenso de Ações do Produto', () => {
  const mockProduct = {
    id: 99,
    name: 'Mentoria Exclusiva',
    slug: 'mentoria-exclusiva',
    meta_pixel_id: '99887766',
    split_rules: [{ id: 1, recipient_id: 10, percentage: 50.0 }],
  };

  it('inicia fechado e abre o menu ao clicar no botão disparador', () => {
    render(
      <ProductActionsDropdown
        product={mockProduct}
        onManagePixel={vi.fn()}
        onManageOrderBumps={vi.fn()}
        onManageUpsell={vi.fn()}
        onManageWebhooks={vi.fn()}
        onConfigureSplit={vi.fn()}
      />
    );

    const triggerBtn = screen.getByTestId('btn-funnel-menu-99');
    expect(triggerBtn).toBeInTheDocument();
    expect(screen.queryByTestId('dropdown-menu-99')).not.toBeInTheDocument();

    fireEvent.click(triggerBtn);

    expect(screen.getByTestId('dropdown-menu-99')).toBeInTheDocument();
    expect(screen.getByText('Meta Pixel')).toBeInTheDocument();
    expect(screen.getByText('Order Bumps')).toBeInTheDocument();
    expect(screen.getByText('UpSell Pós-Compra')).toBeInTheDocument();
    expect(screen.getByText('Webhooks de Saída')).toBeInTheDocument();
    expect(screen.getByText('Divisão de Split')).toBeInTheDocument();
  });

  it('dispara onManagePixel e fecha o menu ao clicar em Meta Pixel', () => {
    const handlePixel = vi.fn();
    render(
      <ProductActionsDropdown
        product={mockProduct}
        onManagePixel={handlePixel}
        onManageOrderBumps={vi.fn()}
        onManageUpsell={vi.fn()}
        onManageWebhooks={vi.fn()}
        onConfigureSplit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-funnel-menu-99'));
    fireEvent.click(screen.getByTestId('btn-pixel-99'));

    expect(handlePixel).toHaveBeenCalledTimes(1);
    expect(handlePixel).toHaveBeenCalledWith(mockProduct);
    expect(screen.queryByTestId('dropdown-menu-99')).not.toBeInTheDocument();
  });

  it('dispara onManageOrderBumps e fecha o menu ao clicar em Order Bumps', () => {
    const handleBumps = vi.fn();
    render(
      <ProductActionsDropdown
        product={mockProduct}
        onManagePixel={vi.fn()}
        onManageOrderBumps={handleBumps}
        onManageUpsell={vi.fn()}
        onManageWebhooks={vi.fn()}
        onConfigureSplit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-funnel-menu-99'));
    fireEvent.click(screen.getByTestId('btn-bumps-99'));

    expect(handleBumps).toHaveBeenCalledTimes(1);
    expect(handleBumps).toHaveBeenCalledWith(mockProduct);
    expect(screen.queryByTestId('dropdown-menu-99')).not.toBeInTheDocument();
  });

  it('dispara onManageUpsell e fecha o menu ao clicar em UpSell', () => {
    const handleUpsell = vi.fn();
    render(
      <ProductActionsDropdown
        product={mockProduct}
        onManagePixel={vi.fn()}
        onManageOrderBumps={vi.fn()}
        onManageUpsell={handleUpsell}
        onManageWebhooks={vi.fn()}
        onConfigureSplit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-funnel-menu-99'));
    fireEvent.click(screen.getByTestId('btn-upsell-99'));

    expect(handleUpsell).toHaveBeenCalledTimes(1);
    expect(handleUpsell).toHaveBeenCalledWith(mockProduct);
    expect(screen.queryByTestId('dropdown-menu-99')).not.toBeInTheDocument();
  });

  it('fecha o menu quando o usuário clica fora do componente', () => {
    render(
      <div>
        <div data-testid="outside-element">Fora</div>
        <ProductActionsDropdown
          product={mockProduct}
          onManagePixel={vi.fn()}
          onManageOrderBumps={vi.fn()}
          onManageUpsell={vi.fn()}
          onManageWebhooks={vi.fn()}
          onConfigureSplit={vi.fn()}
        />
      </div>
    );

    fireEvent.click(screen.getByTestId('btn-funnel-menu-99'));
    expect(screen.getByTestId('dropdown-menu-99')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    expect(screen.queryByTestId('dropdown-menu-99')).not.toBeInTheDocument();
  });

  it('dispara onManageAppearance e fecha o menu ao clicar em Aparência do Checkout', () => {
    const handleAppearance = vi.fn();
    render(
      <ProductActionsDropdown
        product={mockProduct}
        onManagePixel={vi.fn()}
        onManageOrderBumps={vi.fn()}
        onManageUpsell={vi.fn()}
        onManageAppearance={handleAppearance}
        onManageWebhooks={vi.fn()}
        onConfigureSplit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-funnel-menu-99'));
    fireEvent.click(screen.getByTestId('btn-appearance-99'));

    expect(handleAppearance).toHaveBeenCalledTimes(1);
    expect(handleAppearance).toHaveBeenCalledWith(mockProduct);
    expect(screen.queryByTestId('dropdown-menu-99')).not.toBeInTheDocument();
  });

  it('renderiza o menu no portal do document.body com position fixed evitando corte por overflow', () => {
    render(
      <ProductActionsDropdown
        product={mockProduct}
        onManagePixel={vi.fn()}
        onManageOrderBumps={vi.fn()}
        onManageUpsell={vi.fn()}
        onManageAppearance={vi.fn()}
        onManageWebhooks={vi.fn()}
        onConfigureSplit={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-funnel-menu-99'));
    const menu = screen.getByTestId('dropdown-menu-99');
    expect(menu).toBeInTheDocument();
    // Confirma que está anexado diretamente ao body (portal)
    expect(menu.parentElement).toBe(document.body);
    expect(menu.style.position).toBe('fixed');
    expect(menu.style.zIndex).toBe('99999');
  });

  it('calcula abertura para cima quando o botão está no rodapé da viewport (posicionamento inteligente)', () => {
    // Simula janela de altura 600px e botão na posição Y = 550px (sem espaço embaixo)
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 600 });
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });

    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this.getAttribute('data-testid')?.startsWith('btn-funnel-menu')) {
        return {
          top: 540,
          bottom: 575,
          left: 1000,
          right: 1120,
          width: 120,
          height: 35,
        };
      }
      return originalGetBoundingClientRect.call(this);
    };

    try {
      render(
        <ProductActionsDropdown
          product={mockProduct}
          onManagePixel={vi.fn()}
          onManageOrderBumps={vi.fn()}
          onManageUpsell={vi.fn()}
          onManageAppearance={vi.fn()}
          onManageWebhooks={vi.fn()}
          onConfigureSplit={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('btn-funnel-menu-99'));
      const menu = screen.getByTestId('dropdown-menu-99');
      expect(menu).toBeInTheDocument();

      // Com bottom 575 e innerHeight 600, spaceBelow = 25px (< 302px).
      // Deve abrir para cima: top deve ser < 540 (aproximadamente 540 - 290 - 6 = 244px)
      const topNum = parseFloat(menu.style.top);
      expect(topNum).toBeLessThan(540);
      expect(topNum).toBeGreaterThan(0);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });
});

