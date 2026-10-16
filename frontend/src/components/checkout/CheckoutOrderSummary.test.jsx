import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import CheckoutOrderSummary from './CheckoutOrderSummary';

describe('CheckoutOrderSummary - Resumo do Pedido no Checkout', () => {
  const mockProduct = {
    id: 1,
    name: 'Mentoria Exclusiva',
    price_brl: 297.00,
    price_usd: 59.00,
    description: 'Acesso completo a todas as gravações.',
    image_url: 'https://exemplo.com/capa-produto.jpg',
    testimonials: JSON.stringify([
      { id: 1, name: 'Lucas Silva', text: 'Adorei a mentoria!', rating: 5 },
    ]),
  };

  it('renderiza os dados do produto, preço e imagem de capa', () => {
    render(
      <CheckoutOrderSummary
        product={mockProduct}
        paymentMethod="pix"
      />
    );

    expect(screen.getByText('Resumo do Pedido')).toBeInTheDocument();
    expect(screen.getByText('Mentoria Exclusiva')).toBeInTheDocument();
    expect(screen.getByAltText('Mentoria Exclusiva')).toHaveAttribute('src', 'https://exemplo.com/capa-produto.jpg');
    expect(screen.getByTestId('checkout-total-price')).toHaveTextContent('R$ 297,00');
  });

  it('renderiza ícone de fallback quando o produto não tem image_url', () => {
    const productWithoutImg = { ...mockProduct, image_url: null };
    render(
      <CheckoutOrderSummary
        product={productWithoutImg}
        paymentMethod="pix"
      />
    );

    expect(screen.queryByAltText('Mentoria Exclusiva')).not.toBeInTheDocument();
    expect(screen.getByText('Mentoria Exclusiva')).toBeInTheDocument();
  });

  it('renderiza a seção de depoimentos quando presentes no produto', () => {
    render(
      <CheckoutOrderSummary
        product={mockProduct}
        paymentMethod="pix"
      />
    );

    expect(screen.getByTestId('checkout-testimonials-section')).toBeInTheDocument();
    expect(screen.getByText('Lucas Silva')).toBeInTheDocument();
    expect(screen.getByText(/Adorei a mentoria!/)).toBeInTheDocument();
  });

  it('calcula e exibe corretamente o total em USD e bumps ao pagar com cripto', () => {
    const mockBump = {
      id: 10,
      title: 'Ebook Complementar',
      price_brl: 50.0,
    };

    render(
      <CheckoutOrderSummary
        product={mockProduct}
        paymentMethod="crypto"
        selectedBumps={[mockBump]}
        totalOverrideBrl={347.0}
        totalOverrideUsd={68.94}
        usdRate={59.0 / 297.0}
      />
    );

    expect(screen.getByTestId('summary-bump-10')).toHaveTextContent('+ Ebook Complementar');
    expect(screen.getByTestId('summary-bump-10')).toHaveTextContent('$9.93');
    expect(screen.getByTestId('checkout-total-price')).toHaveTextContent('$68.94');
    expect(screen.getByText(/Equiv. aprox. R\$ 347,00/i)).toBeInTheDocument();
  });
});
