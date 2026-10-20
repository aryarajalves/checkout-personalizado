import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import useCardDeclinedFallback from './useCardDeclinedFallback';

describe('useCardDeclinedFallback Hook', () => {
  it('deve inicializar com modal fechado', () => {
    const { result } = renderHook(() =>
      useCardDeclinedFallback({
        product: { enable_card_fallback: true },
        setPaymentMethod: vi.fn(),
        setCardData: vi.fn(),
      })
    );

    expect(result.current.isFallbackOpen).toBe(false);
    expect(result.current.declinedReason).toBe('');
  });

  it('deve abrir o modal quando openFallback for chamado e o produto tiver fallback ativo', () => {
    const { result } = renderHook(() =>
      useCardDeclinedFallback({
        product: { enable_card_fallback: true },
        setPaymentMethod: vi.fn(),
        setCardData: vi.fn(),
      })
    );

    act(() => {
      const opened = result.current.openFallback('Cartão não autorizado');
      expect(opened).toBe(true);
    });

    expect(result.current.isFallbackOpen).toBe(true);
    expect(result.current.declinedReason).toBe('Cartão não autorizado');
  });

  it('NÃO deve abrir o modal se product.enable_card_fallback for false', () => {
    const { result } = renderHook(() =>
      useCardDeclinedFallback({
        product: { enable_card_fallback: false },
        setPaymentMethod: vi.fn(),
        setCardData: vi.fn(),
      })
    );

    act(() => {
      const opened = result.current.openFallback('Cartão não autorizado');
      expect(opened).toBe(false);
    });

    expect(result.current.isFallbackOpen).toBe(false);
  });

  it('handlePayWithPix deve trocar para Pix, submeter checkout com fallback e fechar modal', async () => {
    const setPaymentMethod = vi.fn();
    const submitCheckoutWithMethod = vi.fn().mockResolvedValue({ status: 'pending' });

    const { result } = renderHook(() =>
      useCardDeclinedFallback({
        product: { enable_card_fallback: true },
        setPaymentMethod,
        setCardData: vi.fn(),
        submitCheckoutWithMethod,
      })
    );

    act(() => {
      result.current.openFallback();
    });
    expect(result.current.isFallbackOpen).toBe(true);

    await act(async () => {
      await result.current.handlePayWithPix();
    });

    expect(setPaymentMethod).toHaveBeenCalledWith('pix');
    expect(submitCheckoutWithMethod).toHaveBeenCalledWith({
      overrideMethod: 'pix',
      cardFallbackApplied: true,
    });
    expect(result.current.isFallbackOpen).toBe(false);
  });

  it('handlePayWithHybrid deve trocar para hybrid_pix_card e fechar modal', () => {
    const setPaymentMethod = vi.fn();

    const { result } = renderHook(() =>
      useCardDeclinedFallback({
        product: { enable_card_fallback: true },
        setPaymentMethod,
        setCardData: vi.fn(),
      })
    );

    act(() => {
      result.current.openFallback();
    });

    act(() => {
      result.current.handlePayWithHybrid();
    });

    expect(setPaymentMethod).toHaveBeenCalledWith('hybrid_pix_card');
    expect(result.current.isFallbackOpen).toBe(false);
  });

  it('handleTryAnotherCard deve limpar campos sensíveis do cartão e fechar modal', () => {
    const setPaymentMethod = vi.fn();
    const setCardData = vi.fn();

    const { result } = renderHook(() =>
      useCardDeclinedFallback({
        product: { enable_card_fallback: true },
        setPaymentMethod,
        setCardData,
      })
    );

    act(() => {
      result.current.openFallback();
    });

    act(() => {
      result.current.handleTryAnotherCard();
    });

    expect(setCardData).toHaveBeenCalled();
    expect(setPaymentMethod).toHaveBeenCalledWith('credit_card');
    expect(result.current.isFallbackOpen).toBe(false);
  });
});
