import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SalesManagement from './SalesManagement';
import * as salesApi from './sales/salesApi';
import { ToastProvider } from '../context/ToastContext';

vi.mock('./sales/salesApi');

const mockMetrics = {
  total_revenue_brl: 4500.0,
  pending_revenue_brl: 1200.0,
  total_orders_count: 15,
  paid_orders_count: 10,
  pending_orders_count: 4,
  failed_orders_count: 1,
  refunded_orders_count: 0,
  average_ticket_brl: 450.0,
  conversion_rate_percent: 66.7,
  payment_methods_metrics: [
    {
      method: 'pix',
      label: 'Pix',
      count: 8,
      paid_count: 6,
      revenue_brl: 2700.0,
      percentage: 60.0,
    },
    {
      method: 'credit_card',
      label: 'Cartão de Crédito',
      count: 7,
      paid_count: 4,
      revenue_brl: 1800.0,
      percentage: 40.0,
    },
  ],
};

const mockOrders = [
  {
    id: 1,
    order_code: 'ORD-20261016-0001',
    product_id: 10,
    product_name: 'Mentoria High Ticket',
    offer_name: 'Plano Anual',
    customer_name: 'Juliana Paes',
    customer_email: 'juliana@example.com',
    customer_phone: '11999998888',
    customer_phone_ddi: '55',
    amount_brl: 1000.0,
    payment_method: 'pix',
    status: 'paid',
    gateway_name: 'pagarme',
    utm_source: 'instagram',
    utm_medium: 'stories',
    utm_campaign: 'blackfriday',
    src: 'bio_juliana',
    created_at: '2026-10-16T12:00:00Z',
    paid_at: '2026-10-16T12:02:00Z',
  },
  {
    id: 2,
    order_code: 'ORD-20261016-0002',
    product_id: 10,
    product_name: 'Mentoria High Ticket',
    offer_name: null,
    customer_name: 'Rodrigo Faro',
    customer_email: 'rodrigo@example.com',
    customer_phone: '11988887777',
    customer_phone_ddi: '55',
    amount_brl: 1000.0,
    payment_method: 'credit_card',
    status: 'pending',
    gateway_name: 'pagarme',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'search_mentoria',
    src: 'adwords',
    created_at: '2026-10-16T13:00:00Z',
    paid_at: null,
  },
];

const mockOrderDetails = {
  ...mockOrders[0],
  coupon_code: 'VIP10',
  discount_amount_brl: 100.0,
  affiliate_code: 'AFIL_JULIANA',
  affiliate_commission_brl: 150.0,
  splits: [
    {
      recipient_id: 1,
      recipient_name: 'Sócio Fundador',
      percentage: 70.0,
      amount_brl: 700.0,
    },
    {
      recipient_id: 2,
      recipient_name: 'Co-Produtor',
      percentage: 30.0,
      amount_brl: 300.0,
    },
  ],
};

const mockUtmBi = {
  by_source: [
    { name: 'instagram', total_orders: 8, paid_orders: 6, revenue_brl: 2700.0, conversion_rate: 75.0 },
    { name: 'google', total_orders: 4, paid_orders: 2, revenue_brl: 1000.0, conversion_rate: 50.0 },
    { name: '(direto / orgânico)', total_orders: 3, paid_orders: 2, revenue_brl: 800.0, conversion_rate: 66.7 },
  ],
  by_campaign: [
    { name: 'blackfriday', total_orders: 10, paid_orders: 7, revenue_brl: 3200.0, conversion_rate: 70.0 },
  ],
  by_medium: [
    { name: 'stories', total_orders: 6, paid_orders: 5, revenue_brl: 2200.0, conversion_rate: 83.3 },
  ],
  by_src: [
    { name: 'bio_juliana', total_orders: 5, paid_orders: 4, revenue_brl: 1800.0, conversion_rate: 80.0 },
  ],
};

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SalesManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(salesApi, 'fetchSalesMetricsApi').mockResolvedValue(mockMetrics);
    vi.spyOn(salesApi, 'fetchOrdersReportApi').mockResolvedValue(mockOrders);
    vi.spyOn(salesApi, 'fetchOrderDetailsApi').mockResolvedValue(mockOrderDetails);
    vi.spyOn(salesApi, 'fetchUtmBiAnalyticsApi').mockResolvedValue(mockUtmBi);
    vi.spyOn(salesApi, 'downloadOrdersCsvApi').mockResolvedValue();
  });

  it('renders header, KPI metrics and payment methods on Overview tab', async () => {
    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    expect(screen.getByText('Painel de Vendas & BI')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('stat-total-revenue')).toHaveTextContent('4.500,00');
      expect(screen.getByTestId('stat-average-ticket')).toHaveTextContent('450,00');
      expect(screen.getByTestId('stat-total-orders')).toHaveTextContent('15');
      expect(screen.getByTestId('stat-conversion-rate')).toHaveTextContent('66.7%');
      expect(screen.getByTestId('stat-pending-revenue')).toHaveTextContent('1.200,00');
    });

    // Breakdown por métodos
    expect(screen.getByTestId('method-card-pix')).toBeInTheDocument();
    expect(screen.getByTestId('method-card-credit_card')).toBeInTheDocument();
  });

  it('switches to Orders Report tab and displays orders table', async () => {
    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    const ordersTabBtn = screen.getByTestId('tab-orders-report');
    fireEvent.click(ordersTabBtn);

    await waitFor(() => {
      expect(salesApi.fetchOrdersReportApi).toHaveBeenCalled();
      expect(screen.getByText('ORD-20261016-0001')).toBeInTheDocument();
      expect(screen.getByText('Juliana Paes')).toBeInTheDocument();
      expect(screen.getByText('Rodrigo Faro')).toBeInTheDocument();
    });
  });

  it('opens order details modal displaying customer, UTM and split info', async () => {
    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    fireEvent.click(screen.getByTestId('tab-orders-report'));

    await waitFor(() => {
      expect(screen.getByTestId('view-order-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-order-btn-1'));

    await waitFor(() => {
      const modal = screen.getByTestId('order-details-modal');
      expect(modal).toBeInTheDocument();
      const modalQueries = within(modal);
      expect(modalQueries.getByText(/Pedido ORD-20261016-0001/i)).toBeInTheDocument();
      expect(modalQueries.getByText('instagram')).toBeInTheDocument();
      expect(modalQueries.getByText('Sócio Fundador')).toBeInTheDocument();
      expect(modalQueries.getByText('70%')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('close-order-details-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('order-details-modal')).not.toBeInTheDocument();
    });
  });

  it('switches to UTM BI tab and displays traffic intelligence table', async () => {
    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    const utmBiTabBtn = screen.getByTestId('tab-utm-bi');
    fireEvent.click(utmBiTabBtn);

    await waitFor(() => {
      expect(salesApi.fetchUtmBiAnalyticsApi).toHaveBeenCalled();
      expect(screen.getByText('instagram')).toBeInTheDocument();
      expect(screen.getByText('google')).toBeInTheDocument();
      expect(screen.getByText('(direto / orgânico)')).toBeInTheDocument();
    });
  });

  it('triggers CSV download when export button is clicked', async () => {
    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    fireEvent.click(screen.getByTestId('tab-orders-report'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-export-orders-csv')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-export-orders-csv'));

    await waitFor(() => {
      expect(salesApi.downloadOrdersCsvApi).toHaveBeenCalled();
    });
  });

  it('opens refund modal directly from orders report table and completes refund', async () => {
    vi.spyOn(salesApi, 'refundOrderApi').mockResolvedValue({
      success: true,
      message: 'Pedido estornado com sucesso!',
      order_id: 1,
      status: 'refunded',
      refund_reason: 'Arrependimento de compra / Prazo de 7 dias',
      refunded_at: '2026-10-17T12:00:00Z',
    });

    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    fireEvent.click(screen.getByTestId('tab-orders-report'));

    await waitFor(() => {
      expect(screen.getByTestId('refund-order-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('refund-order-btn-1'));

    await waitFor(() => {
      expect(screen.getByTestId('refund-order-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('confirm-refund-btn'));

    await waitFor(() => {
      expect(salesApi.refundOrderApi).toHaveBeenCalledWith(1, {
        reason: 'Arrependimento de compra / Prazo de 7 dias',
        notes: '',
      });
      expect(screen.queryByTestId('refund-order-modal')).not.toBeInTheDocument();
    });
  });

  it('displays refund banner with reason and date when viewing details of refunded order', async () => {
    vi.spyOn(salesApi, 'fetchOrderDetailsApi').mockResolvedValue({
      id: 2,
      order_code: 'ORD-20261016-0002',
      product_name: 'Mentoria High Ticket',
      customer_name: 'Carlos Reembolsado',
      customer_email: 'carlos@reembolsado.com',
      customer_phone: '11988887777',
      amount_brl: 500.0,
      payment_method: 'pix',
      status: 'refunded',
      gateway_name: 'pagarme',
      refund_reason: 'Insatisfação com o conteúdo / produto',
      refunded_at: '2026-10-17T11:00:00Z',
      splits: [],
    });

    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    fireEvent.click(screen.getByTestId('tab-orders-report'));

    await waitFor(() => {
      expect(screen.getByTestId('view-order-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('view-order-btn-1'));

    await waitFor(() => {
      expect(screen.getByTestId('refund-details-banner')).toBeInTheDocument();
      expect(screen.getByText(/Insatisfação com o conteúdo/i)).toBeInTheDocument();
    });
  });

  it('deletes a single order via deleteOrderApi and refreshes orders', async () => {
    vi.spyOn(salesApi, 'deleteOrderApi').mockResolvedValue({ success: true, message: 'Pedido excluído' });

    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    fireEvent.click(screen.getByTestId('tab-orders-report'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-order-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-order-btn-1'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-order-modal-content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-confirm-delete-order'));

    await waitFor(() => {
      expect(salesApi.deleteOrderApi).toHaveBeenCalledWith(1);
    });
  });

  it('bulk deletes selected orders via bulkDeleteOrdersApi and refreshes orders', async () => {
    vi.spyOn(salesApi, 'bulkDeleteOrdersApi').mockResolvedValue({
      deleted_count: 2,
      message: '2 pedidos excluídos',
    });

    renderWithToast(<SalesManagement currentUser={{ role: 'superadmin' }} />);

    fireEvent.click(screen.getByTestId('tab-orders-report'));

    await waitFor(() => {
      expect(screen.getByTestId('select-all-orders-checkbox')).toBeInTheDocument();
    });

    // Select all on page
    fireEvent.click(screen.getByTestId('select-all-orders-checkbox'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-bulk-delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-bulk-delete'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-order-modal-content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-confirm-delete-order'));

    await waitFor(() => {
      expect(salesApi.bulkDeleteOrdersApi).toHaveBeenCalledWith([1, 2]);
    });
  });
});

