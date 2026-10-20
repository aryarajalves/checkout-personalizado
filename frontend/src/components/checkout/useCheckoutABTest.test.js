import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCheckoutABTest from './useCheckoutABTest';
import * as abTestApi from '../product-management/abTestApi';

vi.mock('../product-management/abTestApi', () => ({
  trackABTestEventApi: vi.fn(),
}));

describe('useCheckoutABTest - Hook de Split 50/50 e Rastreamento de Teste A/B', () => {
  const mockProductWithTest = {
    id: 10,
    slug: 'produto-principal',
    active_ab_test: {
      id: 7,
      name: 'Experimento Split 50/50',
      is_active: true,
      split_ratio: 50,
      offer_a_id: 101,
      offer_b_id: 102,
    },
    offers: [
      { id: 101, slug: 'oferta-a', name: 'Oferta A - R$ 100', price_brl: 100.0 },
      { id: 102, slug: 'oferta-b', name: 'Oferta B - R$ 80', price_brl: 80.0 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('retorna nulls quando o produto não possui teste A/B ativo', () => {
    const productNoTest = { id: 10, slug: 'produto-principal', active_ab_test: null, offers: [] };
    const { result } = renderHook(() => useCheckoutABTest(productNoTest, 'produto-principal'));

    expect(result.current.abTestId).toBeNull();
    expect(result.current.abTestVariant).toBeNull();
    expect(result.current.abOffer).toBeNull();
  });

  it('atribui variante A ou B e persiste no localStorage para novo visitante', async () => {
    const { result } = renderHook(() => useCheckoutABTest(mockProductWithTest, 'produto-principal'));

    expect(result.current.abTestId).toBe(7);
    expect(['A', 'B']).toContain(result.current.abTestVariant);
    expect(localStorage.getItem('checkout_ab_7')).toBe(result.current.abTestVariant);

    if (result.current.abTestVariant === 'A') {
      expect(result.current.abOffer.id).toBe(101);
    } else {
      expect(result.current.abOffer.id).toBe(102);
    }

    await waitFor(() => {
      expect(abTestApi.trackABTestEventApi).toHaveBeenCalledWith(7, result.current.abTestVariant, 'visit');
    });
  });

  it('mantém a variante persistida quando visitante recorrente retorna', async () => {
    localStorage.setItem('checkout_ab_7', 'B');

    const { result } = renderHook(() => useCheckoutABTest(mockProductWithTest, 'produto-principal'));

    expect(result.current.abTestVariant).toBe('B');
    expect(result.current.abOffer.id).toBe(102);
    expect(result.current.abOffer.name).toBe('Oferta B - R$ 80');

    await waitFor(() => {
      expect(abTestApi.trackABTestEventApi).toHaveBeenCalledWith(7, 'B', 'visit');
    });
  });

  it('dispara evento initiate_checkout ao chamar triggerABInitiate()', async () => {
    localStorage.setItem('checkout_ab_7', 'A');

    const { result } = renderHook(() => useCheckoutABTest(mockProductWithTest, 'produto-principal'));

    await waitFor(() => {
      expect(result.current.abTestVariant).toBe('A');
    });

    act(() => {
      result.current.triggerABInitiate();
    });

    expect(abTestApi.trackABTestEventApi).toHaveBeenCalledWith(7, 'A', 'initiate_checkout');

    // Segunda chamada não dispara repetido
    act(() => {
      result.current.triggerABInitiate();
    });
    const initiateCalls = vi.mocked(abTestApi.trackABTestEventApi).mock.calls.filter(
      (call) => call[2] === 'initiate_checkout'
    );
    expect(initiateCalls.length).toBe(1);
  });

  it('não força o teste A/B se o visitante acessou uma URL de oferta direta diferente do produto', () => {
    const { result } = renderHook(() => useCheckoutABTest(mockProductWithTest, 'oferta-b'));

    expect(result.current.abTestVariant).toBeNull();
    expect(result.current.abOffer).toBeNull();
    expect(localStorage.getItem('checkout_ab_7')).toBeNull();
  });
});
