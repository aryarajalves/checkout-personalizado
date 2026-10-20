import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutExpiredOfferScreen from './CheckoutExpiredOfferScreen';

describe('CheckoutExpiredOfferScreen - Tela de Oferta Expirada / Fora do Ar', () => {
  const mockProposal = {
    proposal_code: 'PROP-20261016-DDD71A',
    title: 'Mentoria VIP - Condição Especial WhatsApp',
    customer_name: 'Carlos Roberto',
    amount_brl: 3500.0,
    status: 'expired',
    is_expired: true,
  };

  const mockProduct = {
    id: 1,
    name: 'Bússola Astrológica',
    slug: 'bussola-astrologica',
    price_brl: 4500.0,
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o título GRANDE de link expirado, explicação da data e horário e NENHUM dado para pagar', () => {
    const proposalWithTime = {
      ...mockProposal,
      expires_at: '2026-10-18T20:53:16.541836Z',
    };

    render(
      <CheckoutExpiredOfferScreen
        proposal={proposalWithTime}
        product={mockProduct}
        slug="bussola-astrologica"
      />
    );

    expect(screen.getByTestId('checkout-expired-screen')).toBeInTheDocument();
    // Texto GRANDE
    expect(screen.getByTestId('expired-screen-title')).toHaveTextContent('Este Link de Pagamento Expirou');
    expect(screen.getByTestId('expired-screen-notice')).toHaveTextContent('Este link foi expirado devido à data e horário limite de validade terem se encerrado.');
    expect(screen.getByText(/Prazo limite encerrado em:/)).toBeInTheDocument();
    // Detalhes da proposta (sem valores de pagamento)
    expect(screen.getByText('Mentoria VIP - Condição Especial WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Carlos Roberto')).toBeInTheDocument();
    // Confirma que NÃO há nenhum dado para pagar (preço / R$)
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByText('3500')).not.toBeInTheDocument();
    expect(screen.getByTestId('badge-expired-tag')).toHaveTextContent('Expirada');
  });

  it('abre o WhatsApp com a mensagem pronta ao clicar em falar com o consultor', () => {
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => {});

    render(
      <CheckoutExpiredOfferScreen
        proposal={mockProposal}
        product={mockProduct}
        slug="bussola-astrologica"
      />
    );

    const btn = screen.getByTestId('btn-contact-whatsapp');
    fireEvent.click(btn);

    expect(openMock).toHaveBeenCalled();
    const calledUrl = openMock.mock.calls[0][0];
    expect(calledUrl).toContain('wa.me');
    expect(calledUrl).toContain(encodeURIComponent('Mentoria VIP - Condição Especial WhatsApp'));
  });

  it('exibe o botão para acessar a oferta normal do produto se o produto estiver ativo', () => {
    delete window.location;
    window.location = { href: '' };

    render(
      <CheckoutExpiredOfferScreen
        proposal={mockProposal}
        product={mockProduct}
        slug="bussola-astrologica"
      />
    );

    const btnOffer = screen.getByTestId('btn-view-standard-offer');
    expect(btnOffer).toBeInTheDocument();
    expect(btnOffer).toHaveTextContent('Acessar Oferta Normal do Produto');

    fireEvent.click(btnOffer);
    expect(window.location.href).toBe('/pay/bussola-astrologica');
  });

  it('renderiza tela de oferta desativada quando o produto estiver inativo', () => {
    render(
      <CheckoutExpiredOfferScreen
        product={{ name: 'Curso Descontinuado', is_active: false }}
        slug="curso-descontinuado"
        isProductInactive={true}
      />
    );

    expect(screen.getByTestId('checkout-expired-screen')).toBeInTheDocument();
    expect(screen.getByText('Curso Descontinuado')).toBeInTheDocument();
    expect(screen.getByText('Desativado')).toBeInTheDocument();
  });

  it('possui link funcional para voltar para a página inicial', () => {
    render(
      <CheckoutExpiredOfferScreen
        proposal={mockProposal}
        product={mockProduct}
        slug="bussola-astrologica"
      />
    );

    const homeLink = screen.getByTestId('link-back-home');
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
