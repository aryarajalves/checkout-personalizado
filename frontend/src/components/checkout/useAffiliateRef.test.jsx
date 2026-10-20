import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAffiliateRef from './useAffiliateRef';
import { trackAffiliateClickApi } from '../affiliates/affiliateApi';

vi.mock('../affiliates/affiliateApi', () => ({
  trackAffiliateClickApi: vi.fn(),
}));

describe('useAffiliateRef hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete window.location;
    window.location = new URL('http://localhost/pay/curso-alpha');
    vi.mocked(trackAffiliateClickApi).mockResolvedValue({ valid: true });
  });

  it('detects ref parameter from url, saves to localStorage and tracks click', async () => {
    window.location = new URL('http://localhost/pay/curso-alpha?ref=ALEX10');

    const { result } = renderHook(() => useAffiliateRef('curso-alpha'));

    await waitFor(() => {
      expect(result.current).toBe('ALEX10');
      expect(localStorage.getItem('affiliate_ref')).toBe('ALEX10');
      expect(trackAffiliateClickApi).toHaveBeenCalledWith('curso-alpha', 'ALEX10');
    });
  });

  it('restores affiliate ref from localStorage if not present in url', async () => {
    localStorage.setItem('affiliate_ref', 'SAVED_REF');

    const { result } = renderHook(() => useAffiliateRef('curso-alpha'));

    expect(result.current).toBe('SAVED_REF');

    await waitFor(() => {
      expect(trackAffiliateClickApi).toHaveBeenCalledWith('curso-alpha', 'SAVED_REF');
    });
  });
});
