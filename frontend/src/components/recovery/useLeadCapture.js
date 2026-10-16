import { useEffect, useRef } from 'react';
import { captureLeadApi } from './recoveryApi';
import { validateEmail } from '../checkout/checkoutUtils';
import { getStoredUtmParams } from '../checkout/useUtmParams';

/**
 * Hook para captura automática de lead (Abandono de Checkout) com debounce no Step 1.
 */
export default function useLeadCapture({
  product,
  selectedOffer,
  formData,
  appliedCoupon,
  selectedBumpIds = [],
}) {
  const lastCapturedRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    if (!product || !formData?.name || !formData?.email || !formData?.phone) return;

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim();
    const cleanDigits = (formData.phone || '').replace(/\D/g, '');

    // Validação mínima para disparar captura (nome com 3+ chars, email válido e telefone com 8+ dígitos)
    if (cleanName.length < 3 || !validateEmail(cleanEmail) || cleanDigits.length < 8) {
      return;
    }

    const activeBumps = product.order_bumps?.filter((b) => b.is_active) || [];
    const selectedBumpsList = activeBumps.filter((b) => selectedBumpIds?.includes(b.id));
    const bumpsTotalBrl = selectedBumpsList.reduce((acc, b) => acc + (b.price_brl || 0), 0);
    const currentPriceBrl = selectedOffer?.price_brl ?? (product.price_brl || 0);
    const rawTotalBrl = currentPriceBrl + bumpsTotalBrl;
    const discountBrl = appliedCoupon ? Math.round(rawTotalBrl * (appliedCoupon.discount_percent / 100) * 100) / 100 : 0;
    const estimatedAmount = Math.max(0.01, Math.round((rawTotalBrl - discountBrl) * 100) / 100);

    const currentKey = `${product.id}-${cleanEmail}-${cleanName}-${cleanDigits}-${estimatedAmount}-${appliedCoupon?.code || ''}`;
    if (lastCapturedRef.current === currentKey) {
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const slug = selectedOffer?.slug || product.slug;
        const utmParams = getStoredUtmParams();
        await captureLeadApi({
          slug,
          name: cleanName,
          email: cleanEmail,
          phone: formData.phone.trim(),
          phone_ddi: formData.phone_ddi || '55',
          cpf: formData.cpf ? formData.cpf.trim() : null,
          estimated_amount_brl: estimatedAmount,
          coupon_code: appliedCoupon?.code || null,
          bump_ids: selectedBumpIds,
          ...utmParams,
        });
        lastCapturedRef.current = currentKey;
      } catch {
        // Falha silenciosa para não impactar a fluidez do checkout
      }
    }, 1200);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    product,
    selectedOffer,
    formData?.name,
    formData?.email,
    formData?.phone,
    formData?.phone_ddi,
    formData?.cpf,
    appliedCoupon?.code,
    appliedCoupon?.discount_percent,
    selectedBumpIds,
  ]);
}
