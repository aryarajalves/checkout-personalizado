import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubscriptionManagement from './SubscriptionManagement';
import * as subApi from './subscriptions/subscriptionApi';
import { ToastProvider } from '../context/ToastContext';

vi.mock('./subscriptions/subscriptionApi');

const mockStats = {
  mrr_brl: 297.0,
  active_subscriptions: 3,
  past_due_subscriptions: 1,
  canceled_subscriptions: 0,
  total_subscriptions: 4,
  total_invoices_paid_brl: 891.0,
  total_invoices_count: 5,
};

const mockSubscriptions = [
  {
    id: 1,
    subscription_code: 'SUB-20261016-A1B2',
    customer_name: 'Ana Silva',
    customer_email: 'ana@example.com',
    customer_phone: '11999991111',
    product_id: 10,
    product_name: 'Comunidade VIP',
    offer_id: 20,
    offer_name: 'Plano Mensal',
    billing_cycle: 'monthly',
    amount_brl: 97.0,
    status: 'active',
    gateway: 'pagarme',
    card_last_four: '4242',
    card_brand: 'visa',
    current_cycle: 1,
    start_date: '2026-10-16T12:00:00Z',
    next_billing_at: '2026-11-15T12:00:00Z',
    created_at: '2026-10-16T12:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    invoices: [
      {
        id: 101,
        subscription_id: 1,
        invoice_code: 'INV-20261016-C1D2',
        cycle_number: 1,
        amount_brl: 97.0,
        status: 'paid',
        created_at: '2026-10-16T12:00:00Z',
      },
    ],
  },
  {
    id: 2,
    subscription_code: 'SUB-20261016-B3C4',
    customer_name: 'Bruno Lima',
    customer_email: 'bruno@example.com',
    customer_phone: '11988882222',
    product_id: 10,
    product_name: 'Comunidade VIP',
    offer_id: 21,
    offer_name: 'Plano Anual',
    billing_cycle: 'annual',
    amount_brl: 970.0,
    status: 'paused',
    gateway: 'pagarme',
    card_last_four: '5555',
    card_brand: 'mastercard',
    current_cycle: 1,
    start_date: '2026-10-16T12:00:00Z',
    next_billing_at: '2027-10-16T12:00:00Z',
    created_at: '2026-10-16T12:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
    invoices: [],
  },
];

const mockInvoices = [
  {
    id: 101,
    subscription_id: 1,
    invoice_code: 'INV-20261016-C1D2',
    cycle_number: 1,
    amount_brl: 97.0,
    status: 'paid',
    due_date: '2026-10-16T12:00:00Z',
    paid_at: '2026-10-16T12:01:00Z',
    gateway_charge_id: 'ch_pagarme_12345',
    created_at: '2026-10-16T12:00:00Z',
  },
];

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SubscriptionManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(subApi, 'fetchSubscriptionStatsApi').mockResolvedValue(mockStats);
    vi.spyOn(subApi, 'fetchSubscriptionsApi').mockResolvedValue(mockSubscriptions);
    vi.spyOn(subApi, 'fetchInvoicesApi').mockResolvedValue(mockInvoices);
    vi.spyOn(subApi, 'pauseSubscriptionApi').mockResolvedValue({ ...mockSubscriptions[0], status: 'paused' });
    vi.spyOn(subApi, 'resumeSubscriptionApi').mockResolvedValue({ ...mockSubscriptions[1], status: 'active' });
    vi.spyOn(subApi, 'cancelSubscriptionApi').mockResolvedValue({ ...mockSubscriptions[0], status: 'canceled' });
  });

  it('renders header, KPI metrics and subscription list correctly', async () => {
    renderWithToast(<SubscriptionManagement currentUser={{ role: 'superadmin' }} />);

    expect(screen.getByText('Assinaturas & MRR')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('stat-mrr')).toHaveTextContent('297,00');
      expect(screen.getByTestId('stat-active-subs')).toHaveTextContent('3');
      expect(screen.getByTestId('stat-pastdue-subs')).toHaveTextContent('1');
    });

    // Assinaturas renderizadas na tabela
    await waitFor(() => {
      expect(screen.getByText('SUB-20261016-A1B2')).toBeInTheDocument();
      expect(screen.getByText('Ana Silva')).toBeInTheDocument();
      expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    });
  });

  it('navigates to Invoices tab and displays invoice records', async () => {
    renderWithToast(<SubscriptionManagement currentUser={{ role: 'superadmin' }} />);

    const invoicesTabBtn = screen.getByTestId('tab-btn-invoices');
    fireEvent.click(invoicesTabBtn);

    await waitFor(() => {
      expect(subApi.fetchInvoicesApi).toHaveBeenCalled();
      expect(screen.getByText('INV-20261016-C1D2')).toBeInTheDocument();
      expect(screen.getByText('Ciclo 1')).toBeInTheDocument();
    });
  });

  it('opens details modal and displays customer info and cycle invoices', async () => {
    renderWithToast(<SubscriptionManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('sub-details-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sub-details-btn-1'));

    await waitFor(() => {
      expect(screen.getByTestId('sub-details-modal')).toBeInTheDocument();
      expect(screen.getByText(/Detalhes da Assinatura SUB-20261016-A1B2/i)).toBeInTheDocument();
      expect(screen.getByText('Cartão final 4242 (visa)')).toBeInTheDocument();
    });

    // Fecha modal
    fireEvent.click(screen.getByTestId('close-details-modal-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('sub-details-modal')).not.toBeInTheDocument();
    });
  });

  it('pauses an active subscription', async () => {
    renderWithToast(<SubscriptionManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('sub-pause-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sub-pause-btn-1'));

    await waitFor(() => {
      expect(subApi.pauseSubscriptionApi).toHaveBeenCalledWith(1);
    });
  });

  it('opens cancel modal and confirms cancellation', async () => {
    renderWithToast(<SubscriptionManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('sub-cancel-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sub-cancel-btn-1'));

    await waitFor(() => {
      expect(screen.getByTestId('cancel-subscription-modal')).toBeInTheDocument();
    });

    const reasonInput = screen.getByTestId('cancel-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'Cancelamento por churn voluntário' } });

    const confirmBtn = screen.getByTestId('confirm-cancel-subscription-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(subApi.cancelSubscriptionApi).toHaveBeenCalledWith(1, 'Cancelamento por churn voluntário');
    });
  });
});
