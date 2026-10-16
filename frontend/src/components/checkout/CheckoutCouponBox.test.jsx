import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutCouponBox from './CheckoutCouponBox';
import * as checkoutApi from './checkoutApi';

vi.mock('./checkoutApi');

describe('CheckoutCouponBox Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders coupon input and apply button when no coupon is applied', () => {
    render(
      <CheckoutCouponBox
        slug="produto-teste"
        appliedCoupon={null}
        onApplyCoupon={vi.fn()}
        onRemoveCoupon={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/possui cupom de desconto/i)).toBeInTheDocument();
    expect(screen.getByTestId('apply-coupon-btn')).toBeInTheDocument();
  });

  it('validates and applies coupon successfully on button click', async () => {
    const handleApplyMock = vi.fn();
    vi.spyOn(checkoutApi, 'validateCouponApi').mockResolvedValueOnce({
      valid: true,
      code: 'PROMO15',
      discount_percent: 15.0,
      discount_amount_brl: 30.0,
      discount_amount_usd: 6.0,
      final_amount_brl: 170.0,
      message: "Cupom 'PROMO15' aplicado! 15% de desconto.",
    });

    render(
      <CheckoutCouponBox
        slug="produto-teste"
        appliedCoupon={null}
        onApplyCoupon={handleApplyMock}
        onRemoveCoupon={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/possui cupom de desconto/i);
    fireEvent.change(input, { target: { value: 'promo15' } });
    expect(input.value).toBe('PROMO15'); // Auto uppercase

    const applyBtn = screen.getByTestId('apply-coupon-btn');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(checkoutApi.validateCouponApi).toHaveBeenCalledWith('PROMO15', 'produto-teste', []);
      expect(handleApplyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PROMO15',
          discount_percent: 15.0,
        })
      );
    });
  });

  it('displays error message when API rejects coupon', async () => {
    vi.spyOn(checkoutApi, 'validateCouponApi').mockRejectedValueOnce(
      new Error('Este cupom de desconto já expirou.')
    );

    render(
      <CheckoutCouponBox
        slug="produto-teste"
        appliedCoupon={null}
        onApplyCoupon={vi.fn()}
        onRemoveCoupon={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/possui cupom de desconto/i);
    fireEvent.change(input, { target: { value: 'EXPIRADO' } });

    const applyBtn = screen.getByTestId('apply-coupon-btn');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByTestId('coupon-error-msg')).toHaveTextContent(/já expirou/i);
    });
  });

  it('renders applied coupon badge and allows removal', () => {
    const handleRemoveMock = vi.fn();
    const applied = {
      code: 'BLACKFRIDAY',
      discount_percent: 30,
      discount_amount_brl: 60.0,
    };

    render(
      <CheckoutCouponBox
        slug="produto-teste"
        appliedCoupon={applied}
        onApplyCoupon={vi.fn()}
        onRemoveCoupon={handleRemoveMock}
      />
    );

    expect(screen.getByTestId('applied-coupon-badge')).toBeInTheDocument();
    expect(screen.getByText('BLACKFRIDAY')).toBeInTheDocument();
    expect(screen.getByText('30% OFF')).toBeInTheDocument();

    const removeBtn = screen.getByTestId('remove-coupon-btn');
    fireEvent.click(removeBtn);
    expect(handleRemoveMock).toHaveBeenCalled();
  });
});
