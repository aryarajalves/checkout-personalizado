import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanCep, maskCep, fetchAddressByCep } from './viaCepService';

describe('viaCepService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('cleanCep removes non-digits and truncates to 8 digits', () => {
    expect(cleanCep('01310-100')).toBe('01310100');
    expect(cleanCep('CEP: 12.345-67899')).toBe('12345678');
    expect(cleanCep('')).toBe('');
    expect(cleanCep(null)).toBe('');
  });

  it('maskCep formats as 00000-000', () => {
    expect(maskCep('01310100')).toBe('01310-100');
    expect(maskCep('01310')).toBe('01310');
    expect(maskCep('0131')).toBe('0131');
  });

  it('returns error if CEP does not have 8 digits', async () => {
    const result = await fetchAddressByCep('123');
    expect(result.error).toBe('CEP deve conter 8 dígitos numéricos.');
    expect(result.address).toBeNull();
  });

  it('successfully fetches address from ViaCEP direct', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        complemento: 'lado ímpar',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });

    const result = await fetchAddressByCep('01310100');
    expect(result.error).toBeNull();
    expect(result.address.street).toBe('Avenida Paulista');
    expect(result.address.neighborhood).toBe('Bela Vista');
    expect(result.address.city).toBe('São Paulo');
    expect(result.address.state).toBe('SP');
  });

  it('returns error when ViaCEP returns erro: true', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    });

    const result = await fetchAddressByCep('99999999');
    expect(result.error).toBe('CEP não encontrado.');
    expect(result.address).toBeNull();
  });

  it('falls back to backend API if ViaCEP fails', async () => {
    // 1. Falha no fetch direto
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      // 2. Sucesso no fallback backend
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cep: '01310-100',
          street: 'Avenida Paulista',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        }),
      });

    const result = await fetchAddressByCep('01310100');
    expect(result.error).toBeNull();
    expect(result.address.street).toBe('Avenida Paulista');
    expect(result.address.city).toBe('São Paulo');
  });
});
