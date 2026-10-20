import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecoveryManagement from './RecoveryManagement';
import { ToastProvider } from '../context/ToastContext';

const mockStats = {
  total_abandoned: 5,
  total_recovered: 2,
  total_converted: 1,
  abandoned_rate: 37.5,
  total_abandoned_amount_brl: 2485.0,
  total_recovered_amount_brl: 1491.0,
  total_pix_generated: 12,
  total_pix_pending: 4,
  total_pix_paid: 8,
  pix_conversion_rate: 66.7,
  total_pix_pending_amount_brl: 1988.0,
};

const mockAbandonedCarts = [
  {
    id: 101,
    product_id: 1,
    product_name: 'Mentoria Astro',
    offer_name: 'Plano Anual',
    customer_name: 'Juliana Costa',
    customer_email: 'juliana@test.com',
    customer_phone: '11987654321',
    customer_phone_formatted: '+55 (11) 98765-4321',
    estimated_amount_brl: 997.0,
    coupon_code: 'DESCONTO10',
    recovery_token: 'rec_token_123',
    recovery_url: '/pay/mentoria-astro?recover=rec_token_123',
    status: 'abandoned',
    contacted: false,
    created_at: '2026-10-16T12:00:00Z',
  },
  {
    id: 102,
    product_id: 1,
    product_name: 'Mentoria Astro',
    offer_name: 'Plano Mensal',
    customer_name: 'Marcos Silveira',
    customer_email: 'marcos@test.com',
    customer_phone: '11999991111',
    customer_phone_formatted: '+55 (11) 99999-1111',
    estimated_amount_brl: 497.0,
    coupon_code: null,
    recovery_token: 'rec_token_456',
    recovery_url: '/pay/mentoria-astro?recover=rec_token_456',
    status: 'abandoned',
    contacted: false,
    created_at: '2026-10-16T12:30:00Z',
  },
];

const mockPendingPixOrders = [
  {
    order_id: 201,
    order_code: 'ORD-20261016-PIX01',
    status: 'pending',
    status_label: 'Pix Gerado',
    product_id: 1,
    product_name: 'Mentoria Astro',
    customer_name: 'Rafael Lima',
    customer_email: 'rafael@test.com',
    customer_phone: '21988887777',
    customer_phone_formatted: '+55 (21) 98888-7777',
    amount_brl: 497.0,
    qr_code_text: '00020126580014br.gov.bcb.pix0136test-pix-copia-e-cola-code',
    qr_code_base64: 'fake_base64',
    created_at: '2026-10-16T13:00:00Z',
  },
];

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('RecoveryManagement Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/v1/recovery/stats')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve(mockStats),
        });
      }
      if (url.includes('/api/v1/recovery/abandoned-carts/bulk-delete')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ deleted_count: 2, message: '2 carrinhos excluídos' }),
        });
      }
      if (url.includes('/api/v1/recovery/abandoned-carts/') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ success: true, message: 'Carrinho excluído' }),
        });
      }
      if (url.includes('/api/v1/recovery/abandoned-carts')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'X-Total-Count': '4' }),
          json: () => Promise.resolve(mockAbandonedCarts),
        });
      }
      if (url.includes('/api/v1/recovery/pending-pix')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve(mockPendingPixOrders),
        });
      }
      if (url.includes('/api/v1/products/')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve([{ id: 1, name: 'Mentoria Astro' }]),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders header, stats cards and abandoned carts table with pagination', async () => {
    renderWithToast(<RecoveryManagement />);

    expect(screen.getByText('Recuperação de Vendas')).toBeInTheDocument();
    expect(screen.getByTestId('recovery-stats-cards')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Juliana Costa')).toBeInTheDocument();
      expect(screen.getByText('juliana@test.com')).toBeInTheDocument();
      expect(screen.getByText('+55 (11) 98765-4321')).toBeInTheDocument();
      expect(screen.getByText('DESCONTO10')).toBeInTheDocument();
    });

    expect(screen.getByTestId('btn-whatsapp-101')).toBeInTheDocument();
    expect(screen.getByTestId('recovery-pagination-bar')).toHaveTextContent('Mostrando 1 a 4 de 4 carrinhos (20 por página)');
  });

  it('switches to Pix tab and renders pending pix orders with copy and WhatsApp button', async () => {
    renderWithToast(<RecoveryManagement />);

    const pixTabBtn = screen.getByTestId('tab-pix-btn');
    fireEvent.click(pixTabBtn);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261016-PIX01')).toBeInTheDocument();
      expect(screen.getByText('Rafael Lima')).toBeInTheDocument();
      expect(screen.getByText('+55 (21) 98888-7777')).toBeInTheDocument();
    });

    expect(screen.getByTestId('btn-wa-pix-201')).toBeInTheDocument();
    expect(screen.getByTestId('btn-copy-pix-201')).toBeInTheDocument();
  });

  it('triggers WhatsApp opening with prefilled recovery message', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithToast(<RecoveryManagement />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-whatsapp-101')).toBeInTheDocument();
    });

    const waBtn = screen.getByTestId('btn-whatsapp-101');
    fireEvent.click(waBtn);

    expect(openSpy).toHaveBeenCalled();
    const calledUrl = openSpy.mock.calls[0][0];
    expect(calledUrl).toContain('https://wa.me/5511987654321?text=');
    expect(calledUrl).toContain(encodeURIComponent('Juliana Costa'));
  });

  it('deletes a single abandoned cart with confirmation modal', async () => {
    renderWithToast(<RecoveryManagement />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-cart-101')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-cart-101'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-cart-modal-content')).toBeInTheDocument();
      expect(screen.getByText(/Excluir Carrinho Abandonado/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-confirm-delete-cart'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/recovery/abandoned-carts/101'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('bulk deletes selected abandoned carts with confirmation modal', async () => {
    renderWithToast(<RecoveryManagement />);

    await waitFor(() => {
      expect(screen.getByTestId('select-all-carts-checkbox')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('select-all-carts-checkbox'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-bulk-delete-cart')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-bulk-delete-cart'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-cart-modal-content')).toBeInTheDocument();
      expect(screen.getByText(/Excluir Carrinhos em Massa/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-confirm-delete-cart'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/recovery/abandoned-carts/bulk-delete'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

