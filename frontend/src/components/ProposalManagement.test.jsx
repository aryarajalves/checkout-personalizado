import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProposalManagement from './ProposalManagement';
import { ToastProvider } from '../context/ToastContext';

const mockMetrics = {
  total_proposals: 5,
  active_proposals: 3,
  paid_proposals: 2,
  total_amount_negotiated: 15000.0,
  total_amount_paid: 7000.0,
  conversion_rate: 40.0,
};

const mockProposals = [
  {
    id: 1,
    proposal_code: 'PROP-20261016-AAA111',
    product_id: 1,
    product_name: 'Mentoria VIP',
    product_slug: 'mentoria-vip',
    title: 'Mentoria Individual - Condição WhatsApp',
    customer_name: 'Gabriel Costa',
    customer_email: 'gabriel@email.com',
    customer_phone: '11988887777',
    amount_brl: 3500.0,
    payment_method_allowed: 'all',
    max_installments: 12,
    closer_name: 'Closer Rodrigo',
    status: 'active',
    is_expired: false,
    expires_at: '2026-10-18T12:00:00Z',
    checkout_url: 'http://localhost:3001/pay/mentoria-vip?proposal=PROP-20261016-AAA111',
  },
  {
    id: 2,
    proposal_code: 'PROP-20261016-BBB222',
    product_id: 1,
    product_name: 'Mentoria VIP',
    product_slug: 'mentoria-vip',
    title: 'Consultoria Especial',
    customer_name: 'Fernanda Lima',
    customer_email: 'fernanda@email.com',
    customer_phone: '21977776666',
    amount_brl: 5000.0,
    payment_method_allowed: 'credit_card',
    max_installments: 10,
    closer_name: 'Closer Vanessa',
    status: 'paid',
    is_expired: false,
    expires_at: '2026-10-18T12:00:00Z',
    checkout_url: 'http://localhost:3001/pay/mentoria-vip?proposal=PROP-20261016-BBB222',
  },
];

const mockProducts = [
  { id: 1, name: 'Mentoria VIP', slug: 'mentoria-vip', price_brl: 5000.0 },
];

describe('ProposalManagement - Painel de Propostas High-Ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/v1/proposals/metrics')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockMetrics,
        });
      }
      if (urlStr.includes('/api/v1/proposals')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: mockProposals, total: 2 }),
        });
      }
      if (urlStr.includes('/api/v1/products')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockProducts,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renderiza o cabeçalho e métricas consolidadas', async () => {
    render(
      <ToastProvider>
        <ProposalManagement />
      </ToastProvider>
    );

    expect(screen.getByText(/Links de Negociação Personalizada \(High-Ticket\)/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText(/40%/i)).toBeInTheDocument();
    });
  });

  it('renderiza a tabela com propostas cadastradas', async () => {
    render(
      <ToastProvider>
        <ProposalManagement />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Mentoria Individual - Condição WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Gabriel Costa')).toBeInTheDocument();
      expect(screen.getByText('Fernanda Lima')).toBeInTheDocument();
      expect(screen.getByText(/PROP-20261016-AAA111/i)).toBeInTheDocument();
    });
  });

  it('abre o modal ao clicar em Nova Proposta Personalizada', async () => {
    render(
      <ToastProvider>
        <ProposalManagement />
      </ToastProvider>
    );

    const newBtn = screen.getByText(/Nova Proposta Personalizada/i);
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText(/Nova Proposta Personalizada \(High-Ticket\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Gerar Link da Proposta/i)).toBeInTheDocument();
    });
  });
});
