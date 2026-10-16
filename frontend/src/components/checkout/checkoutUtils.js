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
  product,
  selectedOffer,
  selectedBumpIds,
  appliedCoupon,
  affiliateCode,
  utmParams,
  proposalCode
}) {
  const payload = {
    slug: selectedOffer?.slug || product?.slug,
    name: formData.name.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    phone_ddi: formData.phone_ddi || '55',
    cpf: product?.require_cpf ? formData.cpf.trim() : null,
    payment_method: paymentMethod,
    bump_ids: selectedBumpIds?.length > 0 ? selectedBumpIds : undefined,
    coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
    affiliate_code: affiliateCode || undefined,
    proposal_code: proposalCode || undefined,
    ...utmParams,
  };

  if (paymentMethod === 'credit_card') {
    Object.assign(payload, {
      card_number: cardData.cardNumber,
      card_holder: cardData.cardHolder,
      card_expiry: cardData.cardExpiry,
      card_cvv: cardData.cardCvv,
      installments: cardData.installments,
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

