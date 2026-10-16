import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AffiliateManagement from './AffiliateManagement';
import * as affiliateApi from './affiliates/affiliateApi';
import { ToastProvider } from '../context/ToastContext';

vi.mock('./affiliates/affiliateApi');

const mockStats = {
  total_affiliates: 2,
  active_affiliates: 2,
  total_sales_via_affiliates: 5,
  total_sales_brl: 1000.0,
  total_commissions_pending_brl: 150.0,
  total_commissions_paid_brl: 100.0,
  total_clicks: 42,
};

const mockAffiliates = [
  {
    id: 1,
    name: 'Carlos Parceiro',
    email: 'carlos@afiliado.com',
    phone: '11988887777',
    affiliate_code: 'CARLOS10',
    pix_key: 'carlos@afiliado.com',
    pix_key_type: 'email',
    default_commission_percent: 25.0,
    is_active: true,
    total_sales_count: 3,
    total_sales_brl: 600.0,
    total_commissions_brl: 150.0,
    total_commissions_paid_brl: 50.0,
    product_links: [
      {
        id: 10,
        affiliate_id: 1,
        product_id: 1,
        product_name: 'Curso Alpha',
        product_slug: 'curso-alpha',
        effective_commission_percent: 25.0,
        ref_code: 'CARLOS10',
        clicks_count: 20,
        is_active: true,
        affiliate_link: '/pay/curso-alpha?ref=CARLOS10',
      },
    ],
  },
  {
    id: 2,
    name: 'Maria Influencer',
    email: 'maria@influencer.com',
    phone: '21999990000',
    affiliate_code: 'MARIAVIP',
    pix_key: '21999990000',
    pix_key_type: 'phone',
    default_commission_percent: 20.0,
    is_active: true,
    total_sales_count: 2,
    total_sales_brl: 400.0,
    total_commissions_brl: 80.0,
    total_commissions_paid_brl: 50.0,
    product_links: [],
  },
];

const mockProducts = [
  { id: 1, name: 'Curso Alpha', slug: 'curso-alpha', price_brl: 200.0 },
  { id: 2, name: 'Mentoria Pro', slug: 'mentoria-pro', price_brl: 500.0 },
];

const mockCommissions = [
  {
    id: 101,
    affiliate_id: 1,
    affiliate_name: 'Carlos Parceiro',
    affiliate_code: 'CARLOS10',
    order_id: 501,
    order_code: 'ORD-20261016-A1',
    product_id: 1,
    product_name: 'Curso Alpha',
    amount_brl: 50.0,
    sale_amount_brl: 200.0,
    commission_percent: 25.0,
    status: 'available',
    paid_at: null,
    created_at: '2026-10-16T12:00:00Z',
  },
];

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('AffiliateManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(affiliateApi, 'fetchAffiliateStatsApi').mockResolvedValue(mockStats);
    vi.spyOn(affiliateApi, 'fetchAffiliatesApi').mockResolvedValue(mockAffiliates);
    vi.spyOn(affiliateApi, 'fetchProductsForAffiliatesApi').mockResolvedValue(mockProducts);
    vi.spyOn(affiliateApi, 'fetchCommissionsHistoryApi').mockResolvedValue(mockCommissions);
  });

  it('renders header, KPI cards and list of affiliates', async () => {
    renderWithToast(<AffiliateManagement currentUser={{ role: 'superadmin' }} />);

    expect(screen.getByText(/Gestão de Afiliados & Parcerias/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Carlos Parceiro')).toBeInTheDocument();
      expect(screen.getByText('Maria Influencer')).toBeInTheDocument();
      expect(screen.getByText('CARLOS10')).toBeInTheDocument();
      expect(screen.getByText('MARIAVIP')).toBeInTheDocument();
    });

    // Confere KPI de cliques e vendas
    expect(screen.getByTestId('kpi-total-clicks')).toHaveTextContent('42');
    expect(screen.getByTestId('kpi-total-sales')).toHaveTextContent('R$ 1000.00');
  });

  it('switches to commissions tab and displays commissions table', async () => {
    renderWithToast(<AffiliateManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('Carlos Parceiro')).toBeInTheDocument();
    });

    const commTabBtn = screen.getByTestId('tab-commissions-history');
    fireEvent.click(commTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('commissions-table')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261016-A1')).toBeInTheDocument();
      expect(screen.getByText('R$ 50.00')).toBeInTheDocument();
    });
  });

  it('opens new affiliate modal and submits payload', async () => {
    const createMock = vi.spyOn(affiliateApi, 'createAffiliateApi').mockResolvedValue({
      id: 3,
      name: 'Novo Parceiro',
      email: 'novo@parceiro.com',
      phone: '11977776666',
      affiliate_code: 'NOVO10',
      default_commission_percent: 20.0,
      is_active: true,
      product_links: [],
    });

    renderWithToast(<AffiliateManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('Carlos Parceiro')).toBeInTheDocument();
    });

    const newBtn = screen.getByTestId('btn-new-affiliate');
    fireEvent.click(newBtn);

    expect(screen.getByTestId('affiliate-form-modal')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ex: Carlos Silva'), {
      target: { value: 'Novo Parceiro' },
    });
    fireEvent.change(screen.getByPlaceholderText('carlos@exemplo.com'), {
      target: { value: 'novo@parceiro.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('(11) 98888-7777'), {
      target: { value: '11977776666' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ex: CARLOS10 (deixe vazio p/ auto)'), {
      target: { value: 'NOVO10' },
    });

    const submitBtn = screen.getByTestId('btn-submit-affiliate');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Novo Parceiro',
          email: 'novo@parceiro.com',
          phone: '11977776666',
          affiliate_code: 'NOVO10',
        })
      );
    });
  });

  it('marks a commission as paid through confirmation modal', async () => {
    const markPaidMock = vi.spyOn(affiliateApi, 'markCommissionPaidApi').mockResolvedValue({
      id: 101,
      status: 'paid',
    });

    renderWithToast(<AffiliateManagement currentUser={{ role: 'superadmin' }} />);

    const commTabBtn = screen.getByTestId('tab-commissions-history');
    fireEvent.click(commTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-mark-paid-101')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-mark-paid-101'));

    expect(screen.getByTestId('mark-paid-modal')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar como Pago/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(markPaidMock).toHaveBeenCalledWith(101, '');
    });
  });
});
