import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAffiliateRef from './useAffiliateRef';
import * as affiliateApi from '../affiliates/affiliateApi';

vi.mock('../affiliates/affiliateApi');

describe('useAffiliateRef hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, '', '/pay/curso-alpha');
  });

  it('detects ref parameter from url, saves to localStorage and tracks click', async () => {
    window.history.pushState({}, '', '/pay/curso-alpha?ref=ALEX10');
    const trackMock = vi.spyOn(affiliateApi, 'trackAffiliateClickApi').mockResolvedValue({ valid: true });

    const { result } = renderHook(() => useAffiliateRef('curso-alpha'));

    expect(result.current).toBe('ALEX10');
    expect(localStorage.getItem('affiliate_ref')).toBe('ALEX10');

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('curso-alpha', 'ALEX10');
    });
  });

  it('restores affiliate ref from localStorage if not present in url', async () => {
    localStorage.setItem('affiliate_ref', 'SAVED_REF');
    const trackMock = vi.spyOn(affiliateApi, 'trackAffiliateClickApi').mockResolvedValue({ valid: true });

    const { result } = renderHook(() => useAffiliateRef('curso-alpha'));

    expect(result.current).toBe('SAVED_REF');

    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith('curso-alpha', 'SAVED_REF');
    });
  });
});
