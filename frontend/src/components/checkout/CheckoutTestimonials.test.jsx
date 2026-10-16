import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import CheckoutTestimonials from './CheckoutTestimonials';

describe('CheckoutTestimonials - Depoimentos e Prova Social no Checkout', () => {
  it('não renderiza nada se testimonials for null ou vazio', () => {
    const { container: c1 } = render(<CheckoutTestimonials testimonials={null} />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<CheckoutTestimonials testimonials="[]" />);
    expect(c2.firstChild).toBeNull();
  });

  it('renderiza depoimentos a partir de array de objetos', () => {
    const mockList = [
      {
        id: 1,
        name: 'Ana Paula',
        role: 'Aluna da Turma 1',
        rating: 5,
        text: 'A mentoria mudou meu negócio completamente!',
        avatar_url: 'https://exemplo.com/ana.jpg',
      },
      {
        id: 2,
        name: 'Roberto Dias',
        role: 'Empresário',
        rating: 4,
        text: 'Conteúdo direto ao ponto e excelente suporte.',
        avatar_url: null,
      },
    ];

    render(<CheckoutTestimonials testimonials={mockList} />);

    expect(screen.getByTestId('checkout-testimonials-section')).toBeInTheDocument();
    expect(screen.getByText('O que dizem os nossos clientes')).toBeInTheDocument();
    expect(screen.getByText('Ana Paula')).toBeInTheDocument();
    expect(screen.getByText('• Aluna da Turma 1')).toBeInTheDocument();
    expect(screen.getByText(/A mentoria mudou meu negócio completamente!/)).toBeInTheDocument();
    expect(screen.getByText('Roberto Dias')).toBeInTheDocument();
  });

  it('faz o parse automático quando testimonials é uma string JSON válida', () => {
    const jsonStr = JSON.stringify([
      {
        id: 10,
        name: 'Juliana Ferreira',
        role: 'Designer',
        rating: 5,
        text: 'Melhor investimento do ano!',
      },
    ]);

    render(<CheckoutTestimonials testimonials={jsonStr} />);

    expect(screen.getByTestId('checkout-testimonials-section')).toBeInTheDocument();
    expect(screen.getByText('Juliana Ferreira')).toBeInTheDocument();
    expect(screen.getByText(/Melhor investimento do ano!/)).toBeInTheDocument();
  });
});
