import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutPage from './CheckoutPage';
import * as checkoutApi from './checkoutApi';
import { calculateCheckoutTotals } from './checkoutUtils';

describe('Checkout Payment Method Discounts', () => {
  describe('calculateCheckoutTotals logic', () => {
    const mockProduct = {
      price_brl: 100.0,
      price_usd: 20.0,
      pix_discount_percent: 10.0,
      crypto_discount_percent: 15.0,
      order_bumps: [],
    };

    it('aplica desconto de 10% no Pix corretamente', () => {
      const result = calculateCheckoutTotals({
        product: mockProduct,
        paymentMethod: 'pix',
      });

      expect(result.methodDiscountPercent).toBe(10);
      expect(result.methodDiscountBrl).toBe(10.0);
      expect(result.finalTotalBrl).toBe(90.0);
      expect(result.methodDiscount).toEqual({
        method: 'pix',
        percent: 10,
        amount_brl: 10.0,
        amount_usd: 2.0,
      });
    });

    it('aplica desconto de 15% em Cripto corretamente', () => {
      const result = calculateCheckoutTotals({
        product: mockProduct,
        paymentMethod: 'crypto',
      });

      expect(result.methodDiscountPercent).toBe(15);
      expect(result.methodDiscountUsd).toBe(3.0);
      expect(result.finalTotalUsd).toBe(17.0);
      expect(result.methodDiscountBrl).toBe(15.0);
      expect(result.finalTotalBrl).toBe(85.0);
    });

    it('não aplica desconto no Cartão de Crédito', () => {
      const result = calculateCheckoutTotals({
        product: mockProduct,
        paymentMethod: 'credit_card',
      });

      expect(result.methodDiscountPercent).toBe(0);
      expect(result.methodDiscountBrl).toBe(0);
      expect(result.finalTotalBrl).toBe(100.0);
      expect(result.methodDiscount).toBeNull();
    });

    it('acumula cupom de desconto com desconto Pix', () => {
      // 100.00 base
      // cupom 10% -> 90.00
      // pix 10% sobre 90.00 -> 81.00
      const result = calculateCheckoutTotals({
        product: mockProduct,
        appliedCoupon: { code: 'PROMO10', discount_percent: 10 },
        paymentMethod: 'pix',
      });

      expect(result.couponDiscountBrl).toBe(10.0);
      expect(result.totalAfterCouponBrl).toBe(90.0);
      expect(result.methodDiscountBrl).toBe(9.0);
      expect(result.finalTotalBrl).toBe(81.0);
    });
  });

  describe('CheckoutPage visual & integration', () => {
    const mockProduct = {
      id: 99,
      name: 'Mentoria Elite',
      slug: 'mentoria-elite',
      price_brl: 200.0,
      price_usd: 40.0,
      pix_discount_percent: 10.0,
      crypto_discount_percent: 20.0,
      is_active: true,
      require_cpf: false,
      payment_methods: 'all',
      order_bumps: [],
      offers: [],
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(checkoutApi, 'fetchPublicProductApi').mockResolvedValue(mockProduct);
    });

    it('exibe badges de desconto nas abas e recalcula o total ao alternar métodos', async () => {
      render(<CheckoutPage slug="mentoria-elite" />);

      expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();

      // Badges visíveis
      expect(screen.getByTestId('pix-discount-badge')).toHaveTextContent('🔥 10% OFF');
      expect(screen.getByTestId('crypto-discount-badge')).toHaveTextContent('⚡ 20% OFF');

      // Método padrão: Pix (200 - 10% = 180)
      expect(screen.getByTestId('summary-method-discount')).toBeInTheDocument();
      expect(screen.getByTestId('summary-method-discount')).toHaveTextContent('🔥 Desconto Pix (10%)');
      expect(screen.getByTestId('summary-method-discount')).toHaveTextContent('- R$ 20,00');
      expect(screen.getByTestId('checkout-total-price')).toHaveTextContent('R$ 180,00');
      expect(screen.getByTestId('checkout-submit-button')).toHaveTextContent('Gerar Pix • R$ 180,00');

      // Alterna para Cartão de Crédito (sem desconto: 200)
      fireEvent.click(screen.getByTestId('tab-payment-card'));

      expect(screen.queryByTestId('summary-method-discount')).not.toBeInTheDocument();
      expect(screen.getByTestId('checkout-total-price')).toHaveTextContent('R$ 200,00');
      expect(screen.getByTestId('checkout-submit-button')).toHaveTextContent('Pagar com Cartão • R$ 200,00');

      // Alterna para Cripto (40 USD - 20% = 32 USD)
      fireEvent.click(screen.getByTestId('tab-payment-crypto'));

      expect(screen.getByTestId('summary-method-discount')).toBeInTheDocument();
      expect(screen.getByTestId('summary-method-discount')).toHaveTextContent('⚡ Desconto Cripto (20%)');
      expect(screen.getByTestId('summary-method-discount')).toHaveTextContent('- $8.00');
      expect(screen.getByTestId('checkout-total-price')).toHaveTextContent('$32.00');
    });
  });
});
