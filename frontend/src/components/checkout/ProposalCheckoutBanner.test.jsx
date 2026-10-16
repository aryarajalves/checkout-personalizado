import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProposalCheckoutBanner from './ProposalCheckoutBanner';

describe('ProposalCheckoutBanner - Banner de Proposta Exclusiva', () => {
  it('renderiza null se proposal for nula', () => {
    const { container } = render(<ProposalCheckoutBanner proposal={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza mensagem de proposta expirada se is_expired for true', () => {
    const expiredProposal = {
      title: 'Mentoria VIP 1 a 1',
      customer_name: 'Felipe Santos',
      amount_brl: 3000.0,
      is_expired: true,
      status: 'expired',
      expires_at: new Date(Date.now() - 3600000).toISOString(),
    };

    render(<ProposalCheckoutBanner proposal={expiredProposal} />);
    expect(screen.getByText(/Proposta Personalizada Expirada/i)).toBeInTheDocument();
    expect(screen.getByText(/O prazo de validade desta condição especial negociada encerrou-se/i)).toBeInTheDocument();
  });

  it('renderiza banner exclusivo ativo com dados do cliente e valor negociado', () => {
    const activeProposal = {
      title: 'Mentoria VIP 1 a 1',
      customer_name: 'Felipe Santos',
      amount_brl: 3500.0,
      payment_method_allowed: 'all',
      is_expired: false,
      status: 'active',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    render(<ProposalCheckoutBanner proposal={activeProposal} />);
    expect(screen.getByText(/Condição Exclusiva Reservada para Felipe Santos/i)).toBeInTheDocument();
    expect(screen.getByText(/Mentoria VIP 1 a 1/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*3\.500,00/i)).toBeInTheDocument();
    expect(screen.getByText(/Proposta Especial/i)).toBeInTheDocument();
  });

  it('renderiza condição híbrida detalhada quando configurada', () => {
    const hybridProposal = {
      title: 'Mentoria High-Ticket Híbrida',
      customer_name: 'Aline Barros',
      amount_brl: 4000.0,
      payment_method_allowed: 'hybrid_pix_card',
      custom_pix_amount_brl: 1000.0,
      custom_card_amount_brl: 3000.0,
      is_expired: false,
      status: 'active',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    render(<ProposalCheckoutBanner proposal={hybridProposal} />);
    expect(screen.getByText(/Entrada de R\$\s*1\.000,00 no Pix \+ Saldo no Cartão/i)).toBeInTheDocument();
  });
});
