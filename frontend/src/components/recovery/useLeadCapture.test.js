import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useLeadCapture from './useLeadCapture';
import * as recoveryApi from './recoveryApi';

describe('useLeadCapture Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(recoveryApi, 'captureLeadApi').mockResolvedValue({ cart_id: 1, recovery_token: 'tok_1', status: 'abandoned' });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('does not capture lead if required fields are incomplete or invalid', () => {
    const product = { id: 1, slug: 'produto-teste' };
    const formData = { name: 'Jo', email: 'invalido', phone: '123' };

    renderHook(() =>
      useLeadCapture({
        product,
        formData,
        totalWithBumpsBrl: 100,
        appliedCoupon: null,
        selectedBumpIds: [],
      })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(recoveryApi.captureLeadApi).not.toHaveBeenCalled();
  });

  it('captures lead after debounce when name, email and phone are valid', async () => {
    const product = { id: 1, slug: 'produto-teste', price_brl: 197.0 };
    const formData = {
      name: 'João Pedro da Silva',
      email: 'joao.pedro@test.com',
      phone: '11999998888',
      phone_ddi: '55',
    };

    renderHook(() =>
      useLeadCapture({
        product,
        formData,
        appliedCoupon: { code: 'PROMO10', discount_percent: 0 },
        selectedBumpIds: [2],
      })
    );

    expect(recoveryApi.captureLeadApi).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(recoveryApi.captureLeadApi).toHaveBeenCalledTimes(1);
    expect(recoveryApi.captureLeadApi).toHaveBeenCalledWith({
      slug: 'produto-teste',
      name: 'João Pedro da Silva',
      email: 'joao.pedro@test.com',
      phone: '11999998888',
      phone_ddi: '55',
      cpf: null,
      estimated_amount_brl: 197.0,
      coupon_code: 'PROMO10',
      bump_ids: [2],
    });
  });
});
