import { useEffect, useRef, useState } from 'react';
import { validateCouponApi, fetchCartByTokenApi } from './checkoutApi';
import { maskCpf, maskPhone } from './checkoutUtils';

/**
 * Hook para leitura automática de parâmetros na URL e auto-aplicação de cupons:
 * Suporta: ?name=...&email=...&phone=...&cpf=...&coupon=...&recover=...
 */
export default function usePreFilledCheckout({
  product,
  selectedOffer,
  selectedBumpIds = [],
  setFormData,
  setAppliedCoupon,
  appliedCoupon,
  addToast,
}) {
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [preFilledCouponCode, setPreFilledCouponCode] = useState(null);
  const [couponMessage, setCouponMessage] = useState(null);

  const parsedUrlRef = useRef(false);
  const couponAppliedRef = useRef(false);
  const recoveryFetchedRef = useRef(false);

  // 1. Lê parâmetros da URL no primeiro carregamento
  useEffect(() => {
    if (parsedUrlRef.current) return;
    parsedUrlRef.current = true;

    if (typeof window === 'undefined' || !window.location.search) return;

    const params = new URLSearchParams(window.location.search);

    const name = params.get('name') || params.get('customer_name') || params.get('nome') || '';
    const email = params.get('email') || params.get('customer_email') || '';
    const rawPhone = params.get('phone') || params.get('customer_phone') || params.get('telefone') || params.get('whatsapp') || params.get('tel') || '';
    const ddi = (params.get('phone_ddi') || params.get('ddi') || '').replace(/\D/g, '');
    const rawCpf = params.get('cpf') || params.get('customer_cpf') || params.get('document') || params.get('doc') || '';
    const coupon = params.get('coupon') || params.get('cupom') || params.get('voucher') || '';
    const recoverToken = params.get('recover') || params.get('recovery_token') || params.get('token') || '';

    const hasCustomerData = Boolean(name.trim() || email.trim() || rawPhone.trim() || rawCpf.trim());

    if (hasCustomerData) {
      setIsPreFilled(true);
      setFormData((prev) => ({
        ...prev,
        name: name.trim() || prev.name,
        email: email.trim().toLowerCase() || prev.email,
        phone: rawPhone.trim() ? maskPhone(rawPhone.trim()) : prev.phone,
        phone_ddi: ddi || prev.phone_ddi || '55',
        cpf: rawCpf.trim() ? maskCpf(rawCpf.trim()) : prev.cpf,
      }));
    }

    if (coupon.trim()) {
      setPreFilledCouponCode(coupon.trim().toUpperCase());
    }

    // Se tiver recover token e faltar dados, busca no backend
    if (recoverToken.trim() && !recoveryFetchedRef.current) {
      recoveryFetchedRef.current = true;
      fetchCartByTokenApi(recoverToken.trim())
        .then((cartData) => {
          if (!cartData) return;
          setIsPreFilled(true);
          setFormData((prev) => ({
            ...prev,
            name: prev.name || cartData.customer_name || '',
            email: prev.email || cartData.customer_email || '',
            phone: prev.phone || (cartData.customer_phone ? maskPhone(cartData.customer_phone) : ''),
            phone_ddi: prev.phone_ddi || cartData.customer_phone_ddi || '55',
            cpf: prev.cpf || (cartData.customer_cpf ? maskCpf(cartData.customer_cpf) : ''),
          }));
          if (cartData.coupon_code && !coupon.trim()) {
            setPreFilledCouponCode(cartData.coupon_code.trim().toUpperCase());
          }
        })
        .catch(() => {
          // Ignora silenciosamente se o token estiver expirado ou inválido
        });
    }
  }, [setFormData]);

  // 2. Auto-aplica cupom quando produto/oferta estiverem carregados
  useEffect(() => {
    if (!preFilledCouponCode || couponAppliedRef.current || appliedCoupon) return;
    if (!product && !selectedOffer) return;

    couponAppliedRef.current = true;
    const activeSlug = selectedOffer?.slug || product?.slug;

    validateCouponApi(preFilledCouponCode, activeSlug, selectedBumpIds)
      .then((data) => {
        if (data && data.valid) {
          setAppliedCoupon(data);
          const successMsg = `Cupom "${preFilledCouponCode}" aplicado automaticamente via link!`;
          setCouponMessage({ type: 'success', text: successMsg });
          addToast?.(successMsg, 'success');
        } else {
          const failMsg = data?.message || `Cupom "${preFilledCouponCode}" inválido ou expirado.`;
          setCouponMessage({ type: 'error', text: failMsg });
          addToast?.(failMsg, 'error');
        }
      })
      .catch((err) => {
        const errMsg = err?.message || `Erro ao validar cupom "${preFilledCouponCode}".`;
        setCouponMessage({ type: 'error', text: errMsg });
      });
  }, [preFilledCouponCode, product, selectedOffer, selectedBumpIds, appliedCoupon, setAppliedCoupon, addToast]);

  return {
    isPreFilled,
    preFilledCouponCode,
    couponMessage,
  };
}
