import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CouponManagement from './CouponManagement';
import * as couponApi from './coupon-management/couponApi';
import { ToastProvider } from '../context/ToastContext';

vi.mock('./coupon-management/couponApi');

const mockCoupons = [
  {
    id: 1,
    code: 'PROMO10',
    discount_percent: 10.0,
    product_id: null,
    product_name: null,
    never_expires: true,
    expires_at: null,
    max_uses: null,
    current_uses: 5,
    is_active: true,
    created_at: '2026-10-16T12:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
  },
  {
    id: 2,
    code: 'VIP50',
    discount_percent: 50.0,
    product_id: 1,
    product_name: 'Mentoria VIP',
    never_expires: false,
    expires_at: '2026-12-31T23:59:00Z',
    max_uses: 10,
    current_uses: 10,
    is_active: true,
    created_at: '2026-10-16T12:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
  },
];

const mockProducts = [
  { id: 1, name: 'Mentoria VIP', slug: 'mentoria-vip' },
  { id: 2, name: 'Curso Base', slug: 'curso-base' },
];

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('CouponManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(couponApi, 'fetchCouponsApi').mockResolvedValue(mockCoupons);
    vi.spyOn(couponApi, 'fetchProductsForCouponsApi').mockResolvedValue(mockProducts);
  });

  it('renders header, stats and coupon list correctly', async () => {
    renderWithToast(<CouponManagement currentUser={{ role: 'superadmin' }} />);

    expect(screen.getByText('Cupons de Desconto')).toBeInTheDocument();
    expect(screen.getByText(/carregando cupons/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('PROMO10')).toBeInTheDocument();
      expect(screen.getByText('VIP50')).toBeInTheDocument();
      expect(screen.getByText('10% OFF')).toBeInTheDocument();
      expect(screen.getByText('50% OFF')).toBeInTheDocument();
      expect(screen.getByText('Mentoria VIP')).toBeInTheDocument();
      expect(screen.getByText('🌐 Global (Todos)')).toBeInTheDocument();
      expect(screen.getByText('Vitalício')).toBeInTheDocument();
    });

    // Total de cupons = 2, Utilizações = 15
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('filters coupons by search term', async () => {
    renderWithToast(<CouponManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('PROMO10')).toBeInTheDocument();
      expect(screen.getByText('VIP50')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('input-search-coupon');
    fireEvent.change(searchInput, { target: { value: 'VIP' } });

    expect(screen.queryByText('PROMO10')).not.toBeInTheDocument();
    expect(screen.getByText('VIP50')).toBeInTheDocument();
  });

  it('opens creation modal and saves a new coupon', async () => {
    vi.spyOn(couponApi, 'createCouponApi').mockResolvedValueOnce({
      id: 3,
      code: 'NATAL25',
      discount_percent: 25.0,
      never_expires: true,
      current_uses: 0,
      is_active: true,
    });

    renderWithToast(<CouponManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByText('PROMO10')).toBeInTheDocument();
    });

    const newBtn = screen.getByTestId('btn-new-coupon');
    fireEvent.click(newBtn);

    expect(screen.getByText('Novo Cupom de Desconto')).toBeInTheDocument();

    const codeInput = screen.getByTestId('input-coupon-code');
    fireEvent.change(codeInput, { target: { value: 'natal25' } });
    expect(codeInput.value).toBe('NATAL25');

    const discountInput = screen.getByTestId('input-coupon-discount');
    fireEvent.change(discountInput, { target: { value: '25' } });

    const saveBtn = screen.getByTestId('btn-save-coupon');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(couponApi.createCouponApi).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NATAL25',
          discount_percent: 25,
          never_expires: true,
          is_active: true,
        })
      );
    });
  });

  it('opens delete confirmation modal and removes coupon', async () => {
    vi.spyOn(couponApi, 'deleteCouponApi').mockResolvedValueOnce(true);

    renderWithToast(<CouponManagement currentUser={{ role: 'superadmin' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-coupon-1')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('btn-delete-coupon-1');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
    expect(screen.getByText(/excluir permanentemente o cupom/i)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('btn-confirm-delete');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(couponApi.deleteCouponApi).toHaveBeenCalledWith(1);
    });
  });
});
