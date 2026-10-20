/**
 * Utilitários para formatação, máscaras e validação do Checkout
 */

export function maskCpf(value = '') {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value = '') {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCardNumber(value = '') {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

export function maskCardExpiry(value = '') {
  return value
    .replace(/\D/g, '')
    .slice(0, 4)
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export function isProposalExpired(proposal) {
  if (!proposal) return false;
  if (proposal.is_expired) return true;
  if (proposal.status && proposal.status !== 'active') return true;
  if (proposal.expires_at) {
    const expiryTime = new Date(proposal.expires_at).getTime();
    if (!isNaN(expiryTime) && expiryTime <= Date.now()) {
      return true;
    }
  }
  return false;
}

export function validateEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateCpf(cpf = '') {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function formatCurrency(value, currency = 'BRL') {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function validateCardFields(card = {}, prefix = '') {
  const errs = {};
  const cleanCard = (card.cardNumber || '').replace(/\D/g, '');
  if (cleanCard.length < 15) errs[`${prefix}cardNumber`] = 'Número de cartão inválido.';
  if (!card.cardHolder || card.cardHolder.trim().length < 3) errs[`${prefix}cardHolder`] = 'Informe o nome impresso no cartão.';
  if (!card.cardExpiry || card.cardExpiry.length < 5) errs[`${prefix}cardExpiry`] = 'Informe a validade (MM/AA).';
  if (!card.cardCvv || card.cardCvv.length < 3) errs[`${prefix}cardCvv`] = 'CVV inválido.';
  return errs;
}

export function buildCheckoutPayload({
  formData,
  paymentMethod,
  cardData,
  cryptoData,
  hybridData,
  asaasData,
  product,
  selectedOffer,
  selectedBumpIds,
  appliedCoupon,
  affiliateCode,
  utmParams,
  proposalCode,
  abTestId,
  abTestVariant,
  cardFallbackApplied,
  billingAddress,
}) {
  const payload = {
    slug: selectedOffer?.slug || product?.slug,
    name: formData.name.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    phone_ddi: formData.phone_ddi || '55',
    cpf: (product?.require_cpf || paymentMethod === 'asaas_installments') ? formData.cpf?.trim() : null,
    payment_method: paymentMethod,
    bump_ids: selectedBumpIds?.length > 0 ? selectedBumpIds : undefined,
    coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
    affiliate_code: affiliateCode || undefined,
    proposal_code: proposalCode || undefined,
    ab_test_id: abTestId || undefined,
    ab_test_variant: abTestVariant || undefined,
    card_fallback_applied: cardFallbackApplied || undefined,
    ...utmParams,
  };

  if (billingAddress && (paymentMethod === 'credit_card' || paymentMethod.startsWith('hybrid') || paymentMethod === 'asaas_installments')) {
    Object.assign(payload, {
      billing_zip_code: billingAddress.zipCode?.trim() || undefined,
      billing_street: billingAddress.street?.trim() || undefined,
      billing_number: billingAddress.number?.trim() || undefined,
      billing_complement: billingAddress.complement?.trim() || undefined,
      billing_neighborhood: billingAddress.neighborhood?.trim() || undefined,
      billing_city: billingAddress.city?.trim() || undefined,
      billing_state: billingAddress.state?.trim() || undefined,
    });
  }

  if (paymentMethod === 'credit_card') {
    Object.assign(payload, {
      card_number: cardData.cardNumber,
      card_holder: cardData.cardHolder,
      card_expiry: cardData.cardExpiry,
      card_cvv: cardData.cardCvv,
      installments: cardData.installments,
    });
  } else if (paymentMethod === 'asaas_installments') {
    Object.assign(payload, {
      asaas_installments: asaasData?.installments || 2,
    });
  } else if (paymentMethod === 'crypto') {
    Object.assign(payload, { crypto_currency: cryptoData.currency, crypto_network: cryptoData.network });
  } else if (paymentMethod === 'hybrid_pix_card') {
    Object.assign(payload, {
      hybrid_type: 'pix_card',
      pix_amount_brl: hybridData.pixAmount,
      card_amount_brl: hybridData.cardAmount,
      card_number: hybridData.cardData.cardNumber,
      card_holder: hybridData.cardData.cardHolder,
      card_expiry: hybridData.cardData.cardExpiry,
      card_cvv: hybridData.cardData.cardCvv,
      installments: hybridData.cardData.installments,
    });
  } else if (paymentMethod === 'hybrid_two_cards') {
    Object.assign(payload, {
      hybrid_type: 'two_cards',
      card_amount_brl: hybridData.cardAmount,
      card2_amount_brl: hybridData.card2Amount,
      card_number: hybridData.cardData.cardNumber,
      card_holder: hybridData.cardData.cardHolder,
      card_expiry: hybridData.cardData.cardExpiry,
      card_cvv: hybridData.cardData.cardCvv,
      installments: hybridData.cardData.installments,
      card2_number: hybridData.card2Data.cardNumber,
      card2_holder: hybridData.card2Data.cardHolder,
      card2_expiry: hybridData.card2Data.cardExpiry,
      card2_cvv: hybridData.card2Data.cardCvv,
      card2_installments: hybridData.card2Data.installments,
    });
  }

  return payload;
}

export function calculateCheckoutTotals({
  product,
  selectedOffer,
  proposal,
  selectedBumpIds = [],
  appliedCoupon = null,
  paymentMethod = 'pix',
  cardFallbackApplied = false,
}) {
  const activeBumps = product?.order_bumps?.filter((b) => b.is_active) || [];
  const selectedBumpsList = activeBumps.filter((b) => selectedBumpIds.includes(b.id));
  const bumpsTotalBrl = selectedBumpsList.reduce((acc, b) => acc + (b.price_brl || 0), 0);
  const currentPriceBrl = proposal && !proposal.is_expired
    ? proposal.amount_brl
    : (selectedOffer?.price_brl ?? product?.price_brl ?? 0);
  const currentPriceUsd = selectedOffer?.price_usd ?? product?.price_usd;
  const rawTotalBrl = currentPriceBrl + bumpsTotalBrl;
  const usdRate = currentPriceUsd && currentPriceBrl > 0 ? currentPriceUsd / currentPriceBrl : null;
  const rawTotalUsd = currentPriceUsd
    ? (usdRate ? rawTotalBrl * usdRate : currentPriceUsd)
    : (rawTotalBrl / 5.0);

  // Cupom de desconto
  const couponDiscountBrl = appliedCoupon
    ? Math.round(rawTotalBrl * (appliedCoupon.discount_percent / 100) * 100) / 100
    : 0;
  const totalAfterCouponBrl = Math.max(0.01, Math.round((rawTotalBrl - couponDiscountBrl) * 100) / 100);

  const couponDiscountUsd = appliedCoupon && rawTotalUsd
    ? Math.round(rawTotalUsd * (appliedCoupon.discount_percent / 100) * 100) / 100
    : 0;
  const totalAfterCouponUsd = rawTotalUsd
    ? Math.max(0.01, Math.round((rawTotalUsd - couponDiscountUsd) * 100) / 100)
    : null;

  // Desconto automático por método de pagamento
  let methodDiscountPercent = 0;
  if (paymentMethod === 'pix') {
    if (product?.pix_discount_percent > 0) {
      methodDiscountPercent += Number(product.pix_discount_percent);
    }
    if (cardFallbackApplied && product?.enable_card_fallback !== false && Number(product?.card_fallback_discount_percent || 0) > 0) {
      methodDiscountPercent += Number(product.card_fallback_discount_percent);
    }
  } else if (paymentMethod === 'crypto' && product?.crypto_discount_percent > 0) {
    methodDiscountPercent = Number(product.crypto_discount_percent);
  }

  const methodDiscountBrl = methodDiscountPercent > 0
    ? Math.round(totalAfterCouponBrl * (methodDiscountPercent / 100) * 100) / 100
    : 0;
  const finalTotalBrl = Math.max(0.01, Math.round((totalAfterCouponBrl - methodDiscountBrl) * 100) / 100);

  const methodDiscountUsd = (methodDiscountPercent > 0 && totalAfterCouponUsd)
    ? Math.round(totalAfterCouponUsd * (methodDiscountPercent / 100) * 100) / 100
    : 0;
  const finalTotalUsd = totalAfterCouponUsd
    ? Math.max(0.01, Math.round((totalAfterCouponUsd - methodDiscountUsd) * 100) / 100)
    : null;

  const methodDiscount = methodDiscountPercent > 0 ? {
    method: paymentMethod,
    percent: methodDiscountPercent,
    amount_brl: methodDiscountBrl,
    amount_usd: methodDiscountUsd,
  } : null;

  const couponForSummary = appliedCoupon ? {
    ...appliedCoupon,
    discount_amount_brl: couponDiscountBrl,
    discount_amount_usd: couponDiscountUsd,
  } : null;

  return {
    activeBumps,
    selectedBumpsList,
    bumpsTotalBrl,
    currentPriceBrl,
    currentPriceUsd,
    rawTotalBrl,
    rawTotalUsd,
    usdRate,
    couponDiscountBrl,
    totalAfterCouponBrl,
    couponDiscountUsd,
    totalAfterCouponUsd,
    methodDiscountPercent,
    methodDiscountBrl,
    methodDiscountUsd,
    methodDiscount,
    finalTotalBrl,
    finalTotalUsd,
    couponForSummary,
  };
}

