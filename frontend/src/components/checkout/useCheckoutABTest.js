import { useState, useEffect, useRef } from 'react';
import { trackABTestEventApi } from '../product-management/abTestApi';

/**
 * Hook para gerenciar divisão de tráfego (Split 50/50) de Teste A/B no checkout público.
 * Persiste a variante no localStorage do visitante para coerência em navegações futuras.
 */
export default function useCheckoutABTest(product, slug) {
  const [abVariant, setAbVariant] = useState(null);
  const [abOffer, setAbOffer] = useState(null);
  const hasTrackedVisitRef = useRef(false);
  const hasTrackedInitiateRef = useRef(false);

  const test = product?.active_ab_test;

  useEffect(() => {
    if (!test || !test.is_active || !product) {
      setAbVariant(null);
      setAbOffer(null);
      return;
    }

    // Se o visitante acessou diretamente a URL de uma oferta específica que não é o slug do produto,
    // respeita a oferta explícita sem forçar o teste A/B
    const isDirectSpecificOffer = slug && slug !== product.slug && product.offers?.some((o) => o.slug === slug);
    if (isDirectSpecificOffer) {
      return;
    }

    try {
      const storageKey = `checkout_ab_${test.id}`;
      let assigned = localStorage.getItem(storageKey);

      if (assigned !== 'A' && assigned !== 'B') {
        const ratio = typeof test.split_ratio === 'number' ? test.split_ratio : 50;
        assigned = Math.random() * 100 < ratio ? 'A' : 'B';
        localStorage.setItem(storageKey, assigned);
      }

      setAbVariant(assigned);

      const targetOfferId = assigned === 'A' ? test.offer_a_id : test.offer_b_id;
      const matched = product.offers?.find((o) => o.id === targetOfferId) || null;
      setAbOffer(matched);

      if (!hasTrackedVisitRef.current) {
        hasTrackedVisitRef.current = true;
        trackABTestEventApi(test.id, assigned, 'visit');
      }
    } catch {
      // Fallback seguro se localStorage não estiver disponível
      setAbVariant('A');
    }
  }, [product, test, slug]);

  const triggerABInitiate = () => {
    if (!hasTrackedInitiateRef.current && test?.id && abVariant) {
      hasTrackedInitiateRef.current = true;
      trackABTestEventApi(test.id, abVariant, 'initiate_checkout');
    }
  };

  return {
    abTestId: test?.id || null,
    abTestVariant: abVariant,
    abOffer,
    triggerABInitiate,
  };
}
