import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBillingAddress from './useBillingAddress';
import * as viaCepService from './viaCepService';

describe('useBillingAddress', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default empty values', () => {
    const { result } = renderHook(() => useBillingAddress());
    expect(result.current.billingAddress.zipCode).toBe('');
    expect(result.current.billingAddress.street).toBe('');
    expect(result.current.billingAddress.number).toBe('');
    expect(result.current.loadingCep).toBe(false);
  });

  it('masks zipCode and forces uppercase on state in handleAddressChange', () => {
    const { result } = renderHook(() => useBillingAddress());

    act(() => {
      result.current.handleAddressChange('zipCode', '01310100');
    });
    expect(result.current.billingAddress.zipCode).toBe('01310-100');

    act(() => {
      result.current.handleAddressChange('state', 'sp');
    });
    expect(result.current.billingAddress.state).toBe('SP');
  });

  it('validates required fields and reports errors', () => {
    const { result } = renderHook(() => useBillingAddress());

    let validation;
    act(() => {
      validation = result.current.validateBillingAddress();
    });

    expect(validation.isValid).toBe(false);
    expect(validation.errors.zipCode).toBeDefined();
    expect(validation.errors.street).toBeDefined();
    expect(validation.errors.number).toBeDefined();
    expect(validation.errors.neighborhood).toBeDefined();
    expect(validation.errors.city).toBeDefined();
    expect(validation.errors.state).toBeDefined();
  });

  it('validates successfully when all fields are present', () => {
    const { result } = renderHook(() =>
      useBillingAddress({
        zipCode: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Sala 10',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      })
    );

    let validation;
    act(() => {
      validation = result.current.validateBillingAddress();
    });

    expect(validation.isValid).toBe(true);
    expect(Object.keys(validation.errors)).toHaveLength(0);
  });

  it('populates fields on successful CEP lookup', async () => {
    vi.spyOn(viaCepService, 'fetchAddressByCep').mockResolvedValueOnce({
      error: null,
      address: {
        zipCode: '01310-100',
        street: 'Avenida Paulista',
        complement: '',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
    });

    const { result } = renderHook(() => useBillingAddress());

    await act(async () => {
      await result.current.handleCepLookup('01310100');
    });

    expect(result.current.billingAddress.street).toBe('Avenida Paulista');
    expect(result.current.billingAddress.neighborhood).toBe('Bela Vista');
    expect(result.current.billingAddress.city).toBe('São Paulo');
    expect(result.current.billingAddress.state).toBe('SP');
    expect(result.current.cepNotice).toBeNull();
  });
});
