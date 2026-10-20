import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ProductConversionModal } from './ProductConversionModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductConversionConfigApi: vi.fn(),
  updateProductConversionConfigApi: vi.fn(),
  fetchCouponsForConversionApi: vi.fn(),
}));

describe('ProductConversionModal - Gatilhos de Conversão', () => {
  const mockProduct = {
    id: 10,
    name: 'Mentoria Exclusiva',
    slug: 'mentoria-exclusiva',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ProductConversionModal
        product={mockProduct}
        isOpen={false}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('carrega dados existentes de Exit-Intent e Prova Social', async () => {
    productApi.fetchProductConversionConfigApi.mockResolvedValueOnce({
      enable_exit_intent: true,
      exit_intent_coupon_id: 1,
      exit_intent_coupon_code: 'VOLTA15',
      exit_intent_coupon_discount_percent: 15.0,
      exit_intent_title: 'Espere! Desconto exclusivo',
      exit_intent_subtitle: 'Leve agora com 15% de desconto!',
      enable_social_proof: true,
      social_proof_mode: 'hybrid',
    });
    productApi.fetchCouponsForConversionApi.mockResolvedValueOnce([
      { id: 1, code: 'VOLTA15', discount_percent: 15.0, is_active: true, product_id: null },
    ]);

    render(
      <ProductConversionModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    expect(screen.getByText(/Gatilhos de Alta Conversão/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('toggle-enable-exit-intent')).toBeChecked();
      expect(screen.getByTestId('input-exit-intent-title')).toHaveValue('Espere! Desconto exclusivo');
      expect(screen.getByTestId('input-exit-intent-subtitle')).toHaveValue('Leve agora com 15% de desconto!');
      expect(screen.getByTestId('toggle-enable-social-proof')).toBeChecked();
      expect(screen.getByTestId('radio-mode-hybrid')).toBeChecked();
    });
  });

  it('exibe erro de validação se ativar Exit-Intent sem selecionar cupom', async () => {
    productApi.fetchProductConversionConfigApi.mockResolvedValueOnce({
      enable_exit_intent: false,
      exit_intent_coupon_id: null,
      enable_social_proof: false,
      social_proof_mode: 'hybrid',
    });
    productApi.fetchCouponsForConversionApi.mockResolvedValueOnce([
      { id: 1, code: 'DESCONTO10', discount_percent: 10.0, is_active: true },
    ]);

    const showFeedback = vi.fn();

    render(
      <ProductConversionModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={showFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('toggle-enable-exit-intent')).not.toBeChecked();
    });

    // Ativa Exit-Intent mas não seleciona cupom
    fireEvent.click(screen.getByTestId('toggle-enable-exit-intent'));

    fireEvent.click(screen.getByTestId('btn-save-conversion'));

    expect(showFeedback).toHaveBeenCalledWith('error', expect.stringContaining('cupom'));
    expect(productApi.updateProductConversionConfigApi).not.toHaveBeenCalled();
  });

  it('salva configurações atualizadas com sucesso', async () => {
    productApi.fetchProductConversionConfigApi.mockResolvedValueOnce({
      enable_exit_intent: false,
      exit_intent_coupon_id: null,
      enable_social_proof: false,
      social_proof_mode: 'hybrid',
    });
    productApi.fetchCouponsForConversionApi.mockResolvedValueOnce([
      { id: 2, code: 'LASTCHANCE', discount_percent: 25.0, is_active: true },
    ]);
    productApi.updateProductConversionConfigApi.mockResolvedValueOnce({
      enable_exit_intent: true,
      exit_intent_coupon_id: 2,
      enable_social_proof: true,
      social_proof_mode: 'simulated',
    });

    const onClose = vi.fn();
    const showFeedback = vi.fn();

    render(
      <ProductConversionModal
        product={mockProduct}
        isOpen={true}
        onClose={onClose}
        showFeedback={showFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('toggle-enable-exit-intent')).not.toBeChecked();
    });

    // Ativa Exit-Intent e seleciona cupom
    fireEvent.click(screen.getByTestId('toggle-enable-exit-intent'));
    fireEvent.change(screen.getByTestId('select-exit-intent-coupon'), { target: { value: '2' } });

    // Ativa Prova Social e seleciona modo simulado
    fireEvent.click(screen.getByTestId('toggle-enable-social-proof'));
    fireEvent.click(screen.getByTestId('radio-mode-simulated'));

    // Submete formulário
    fireEvent.click(screen.getByTestId('btn-save-conversion'));

    await waitFor(() => {
      expect(productApi.updateProductConversionConfigApi).toHaveBeenCalledWith(10, expect.objectContaining({
        enable_exit_intent: true,
        exit_intent_coupon_id: 2,
        enable_social_proof: true,
        social_proof_mode: 'simulated',
      }));
      expect(showFeedback).toHaveBeenCalledWith('success', expect.stringContaining('sucesso'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
