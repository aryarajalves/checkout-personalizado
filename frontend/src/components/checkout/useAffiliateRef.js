import { useState, useEffect } from 'react';
import { trackAffiliateClickApi } from '../affiliates/affiliateApi';

/**
 * Hook para detecção, rastreamento e persistência de código de afiliado (?ref=CODIGO).
 */
export default function useAffiliateRef(slug) {
  const [affiliateCode, setAffiliateCode] = useState(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const refFromUrl = searchParams.get('ref');
      if (refFromUrl) {
        const clean = refFromUrl.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        localStorage.setItem('affiliate_ref', clean);
        return clean;
      }
      return localStorage.getItem('affiliate_ref') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (!slug) return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const refFromUrl = searchParams.get('ref');
      const activeCode = refFromUrl ? refFromUrl.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : localStorage.getItem('affiliate_ref');

      if (activeCode) {
        setAffiliateCode(activeCode);
        localStorage.setItem('affiliate_ref', activeCode);
        // Dispara contagem de clique em background sem travar a interface
        trackAffiliateClickApi(slug, activeCode).catch(() => {});
      }
    } catch {
      // Ignora falhas em ambientes restritos
    }
  }, [slug]);

  return affiliateCode;
}
