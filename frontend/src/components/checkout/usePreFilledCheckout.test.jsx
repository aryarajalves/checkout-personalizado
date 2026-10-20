import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook, act, waitFor } from '@testing-library/react';
import usePreFilledCheckout from './usePreFilledCheckout';
import CheckoutCustomerForm from './CheckoutCustomerForm';
import * as checkoutApi from './checkoutApi';

describe('usePreFilledCheckout & Pre-filled Checkout (#2)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete window.location;
    window.location = originalLocation;
  });

  function setWindowSearch(searchString) {
    delete window.location;
    window.location = new URL(`http://localhost:3000/pay/curso-teste${searchString}`);
  }

  it('deve extrair nome, email, telefone, cpf e cupom da URL e preencher formData', () => {
    setWindowSearch('?name=Gabriel+Costa&email=gabriel%40teste.com&phone=11999998888&cpf=12345678901&coupon=PROMO20');

    let currentFormData = { name: '', email: '', phone: '', phone_ddi: '55', cpf: '' };
    const setFormData = vi.fn((updater) => {
      currentFormData = typeof updater === 'function' ? updater(currentFormData) : updater;
    });
    const setAppliedCoupon = vi.fn();

    const { result } = renderHook(() =>
      usePreFilledCheckout({
        product: null,
        selectedOffer: null,
        setFormData,
        setAppliedCoupon,
        appliedCoupon: null,
      })
    );

    expect(result.current.isPreFilled).toBe(true);
    expect(result.current.preFilledCouponCode).toBe('PROMO20');
    expect(setFormData).toHaveBeenCalled();
    expect(currentFormData.name).toBe('Gabriel Costa');
    expect(currentFormData.email).toBe('gabriel@teste.com');
    expect(currentFormData.phone).toBe('(11) 99999-8888');
    expect(currentFormData.cpf).toBe('123.456.789-01');
  });

  it('deve auto-aplicar cupom via validateCouponApi quando o produto estiver carregado', async () => {
    setWindowSearch('?coupon=VIP30');

    const mockCouponResponse = {
      valid: true,
      code: 'VIP30',
      discount_percent: 30,
      discount_amount_brl: 30.0,
      final_total_brl: 70.0,
    };

    const validateSpy = vi.spyOn(checkoutApi, 'validateCouponApi').mockResolvedValue(mockCouponResponse);

    const setFormData = vi.fn();
    const setAppliedCoupon = vi.fn();
    const addToast = vi.fn();

    const product = { id: 1, slug: 'produto-vip' };
    const selectedOffer = { id: 10, slug: 'oferta-vip' };

    const { result } = renderHook(() =>
      usePreFilledCheckout({
        product,
        selectedOffer,
        setFormData,
        setAppliedCoupon,
        appliedCoupon: null,
        addToast,
      })
    );

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledWith('VIP30', 'oferta-vip', []);
      expect(setAppliedCoupon).toHaveBeenCalledWith(mockCouponResponse);
      expect(result.current.couponMessage?.type).toBe('success');
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('VIP30'), 'success');
    });
  });

  it('deve buscar dados por recovery token se fornecido na URL (?recover=tok_123)', async () => {
    setWindowSearch('?recover=tok_cart_xyz');

    const mockCartData = {
      customer_name: 'Beatriz Ramos',
      customer_email: 'beatriz@teste.com',
      customer_phone: '21988887777',
      customer_phone_ddi: '55',
      customer_cpf: '11122233344',
      coupon_code: 'VOLTA15',
    };

    const fetchCartSpy = vi.spyOn(checkoutApi, 'fetchCartByTokenApi').mockResolvedValue(mockCartData);

    let currentFormData = { name: '', email: '', phone: '', phone_ddi: '55', cpf: '' };
    const setFormData = vi.fn((updater) => {
      currentFormData = typeof updater === 'function' ? updater(currentFormData) : updater;
    });
    const setAppliedCoupon = vi.fn();

    const { result } = renderHook(() =>
      usePreFilledCheckout({
        product: null,
        selectedOffer: null,
        setFormData,
        setAppliedCoupon,
        appliedCoupon: null,
      })
    );

    await waitFor(() => {
      expect(fetchCartSpy).toHaveBeenCalledWith('tok_cart_xyz');
      expect(result.current.isPreFilled).toBe(true);
      expect(currentFormData.name).toBe('Beatriz Ramos');
      expect(currentFormData.email).toBe('beatriz@teste.com');
    });
  });

  it('deve exibir o badge "✓ Pré-preenchido" no CheckoutCustomerForm quando isPreFilled=true', () => {
    const formData = {
      name: 'João Silva',
      email: 'joao@teste.com',
      phone: '(11) 98765-4321',
      phone_ddi: '55',
      cpf: '',
    };

    render(
      <CheckoutCustomerForm
        formData={formData}
        onChange={vi.fn()}
        isPreFilled={true}
      />
    );

    const badge = screen.getByTestId('prefilled-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('Pré-preenchido');
  });

  it('não deve exibir o badge "✓ Pré-preenchido" no CheckoutCustomerForm quando isPreFilled=false', () => {
    const formData = {
      name: '',
      email: '',
      phone: '',
      phone_ddi: '55',
      cpf: '',
    };

    render(
      <CheckoutCustomerForm
        formData={formData}
        onChange={vi.fn()}
        isPreFilled={false}
      />
    );

    expect(screen.queryByTestId('prefilled-badge')).not.toBeInTheDocument();
  });
});
