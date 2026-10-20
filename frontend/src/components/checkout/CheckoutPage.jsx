import React, { useState, useEffect, useRef } from 'react';
import { fetchPublicProductApi, fetchPublicProductByDomainApi, processCheckoutApi, validateCouponApi } from './checkoutApi';
import CheckoutOrderSummary from './CheckoutOrderSummary';
import CheckoutCustomerForm from './CheckoutCustomerForm';
import CheckoutPaymentMethods from './CheckoutPaymentMethods';
import CheckoutOrderResult from './CheckoutOrderResult';
import CheckoutOrderBump from './CheckoutOrderBump';
import CheckoutCountdownBar from './CheckoutCountdownBar';
import CheckoutCouponBox from './CheckoutCouponBox';
import ExitIntentModal from './ExitIntentModal';
import SocialProofToast from './SocialProofToast';
import useExitIntent from './useExitIntent';
import useLeadCapture from '../recovery/useLeadCapture';
import useAffiliateRef from './useAffiliateRef';
import useCheckoutABTest from './useCheckoutABTest';
import '../../styles/checkout-pix.css'; import '../../styles/checkout-conversion.css';
import '../../styles/checkout-hybrid.css'; import '../../styles/proposals.css';
import ProposalCheckoutBanner from './ProposalCheckoutBanner';
import { useProposal } from './useProposal';
import { validateEmail, validateCpf, formatCurrency, validateCardFields, buildCheckoutPayload, calculateCheckoutTotals, isProposalExpired } from './checkoutUtils';
import { Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { initAllPixels, trackPixelPageView, trackPixelInitiateCheckout, trackPixelPurchase } from './pixelService';
import { useUtmParams } from './useUtmParams';
import CheckoutHeaderMedia from './CheckoutHeaderMedia';
import usePreFilledCheckout from './usePreFilledCheckout';
import useCardDeclinedFallback from './useCardDeclinedFallback';
import CardDeclinedFallbackModal from './CardDeclinedFallbackModal';
import useBillingAddress from './useBillingAddress';
import CheckoutBillingAddress from './CheckoutBillingAddress';
import CheckoutExpiredOfferScreen from './CheckoutExpiredOfferScreen';

export default function CheckoutPage({ slug, domain }) {
  const [product, setProduct] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [selectedBumpIds, setSelectedBumpIds] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const redirectTimerRef = useRef(null);

  // Refs para prevenir disparos duplicados de eventos de pixel
  const initiateCheckoutTracked = useRef(false), purchaseTracked = useRef(false);

  // Form states
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', phone_ddi: '55', cpf: '' });
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const emptyCard = { cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '', installments: 1 };
  const [cardData, setCardData] = useState(emptyCard);
  const [cryptoData, setCryptoData] = useState({ currency: 'USDT', network: 'polygon' });
  const [hybridData, setHybridData] = useState({ pixAmount: 0, cardAmount: 0, card2Amount: 0, cardData: emptyCard, card2Data: emptyCard });
  const [asaasData, setAsaasData] = useState({ installments: 2 });
  const [errors, setErrors] = useState({});

  const { abTestId, abTestVariant, abOffer, triggerABInitiate } = useCheckoutABTest(product, slug);
  useEffect(() => { if (abOffer) setSelectedOffer(abOffer); }, [abOffer]);

  useLeadCapture({ product, selectedOffer, formData, appliedCoupon, selectedBumpIds, abTestId, abTestVariant });
  const { isPreFilled } = usePreFilledCheckout({ product, selectedOffer, selectedBumpIds, setFormData, setAppliedCoupon, appliedCoupon });
  const affiliateCode = useAffiliateRef(slug);
  const utmParams = useUtmParams();

  const {
    billingAddress, addressErrors, loadingCep, cepNotice,
    handleAddressChange, handleCepLookup, validateBillingAddress,
  } = useBillingAddress();

  const { isExitIntentOpen, closeExitIntent } = useExitIntent(
    Boolean(product?.enable_exit_intent && product?.exit_intent_coupon_code && !createdOrder)
  );

  const handleApplyExitIntent = async (code) => {
    try { setAppliedCoupon(await validateCouponApi(code, selectedOffer?.slug || product?.slug, selectedBumpIds)); }
    catch { setAppliedCoupon({ valid: true, code, discount_percent: product?.exit_intent_coupon_discount_percent || 10 }); }
  };

  const handleProposalLoaded = (prop) => {
    if (!prop) return;
    setFormData((prev) => ({
      ...prev,
      name: prop.customer_name || prev.name, email: prop.customer_email || prev.email,
      phone: prop.customer_phone || prev.phone, cpf: prop.customer_cpf || prev.cpf,
    }));
    if (prop.payment_method_allowed && prop.payment_method_allowed !== 'all') setPaymentMethod(prop.payment_method_allowed);
    if (prop.payment_method_allowed === 'hybrid_pix_card' && prop.custom_pix_amount_brl && prop.custom_card_amount_brl) {
      setHybridData((prev) => ({ ...prev, pixAmount: prop.custom_pix_amount_brl, cardAmount: prop.custom_card_amount_brl }));
    }
  };
  const { proposal, loadingProposal, proposalError } = useProposal(slug, handleProposalLoaded);

  useEffect(() => {
    let isMounted = true;
    async function loadProduct() {
      try {
        setLoading(true); setFetchError(null);
        const data = slug ? await fetchPublicProductApi(slug) : await fetchPublicProductByDomainApi(domain);
        if (!isMounted) return;
        setProduct(data);
        if (data.meta_pixel_id || data.google_ads_id || data.tiktok_pixel_id) {
          initAllPixels(data); trackPixelPageView();
        }
        const matched = (slug && data.offers?.find((o) => o.slug === slug)) || data.offers?.find((o) => o.is_default) || data.offers?.[0];
        if (matched) setSelectedOffer(matched);
      } catch (err) {
        if (isMounted) setFetchError(err.message || 'Não foi possível carregar a oferta.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (slug || domain) loadProduct();
    else { setFetchError('Slug ou domínio de checkout não informado.'); setLoading(false); }
    return () => { isMounted = false; };
  }, [slug, domain]);

  const triggerInitiateCheckout = () => {
    if (triggerABInitiate) triggerABInitiate();
    if (!initiateCheckoutTracked.current && (product?.meta_pixel_id || product?.google_ads_id || product?.tiktok_pixel_id)) {
      initiateCheckoutTracked.current = true;
      trackPixelInitiateCheckout(product, selectedOffer);
    }
  };

  const handleSelectPaymentMethod = (method) => {
    if (proposal?.payment_method_allowed && proposal.payment_method_allowed !== 'all' && proposal.payment_method_allowed !== method) return;
    setPaymentMethod(method); triggerInitiateCheckout();
  };
  const handleCustomerChange = (e) => {
    triggerInitiateCheckout();
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };
  const handleCardChange = (e) => {
    triggerInitiateCheckout();
    const { name, value } = e.target;
    setCardData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };
  const handleCryptoChange = (e) => {
    triggerInitiateCheckout();
    setCryptoData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleToggleBump = (bumpId) => {
    setSelectedBumpIds((prev) => prev.includes(bumpId) ? prev.filter((id) => id !== bumpId) : [...prev, bumpId]);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 3) newErrors.name = 'Informe seu nome completo (mínimo 3 letras).';
    if (!formData.email || !validateEmail(formData.email)) newErrors.email = 'Informe um e-mail válido.';
    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    const isBr = (formData.phone_ddi || '55') === '55';
    if (!cleanPhone || cleanPhone.length < (isBr ? 10 : 6)) {
      newErrors.phone = isBr ? 'Informe um telefone/celular válido com DDD.' : 'Informe um telefone válido.';
    }
    if ((product?.require_cpf || paymentMethod === 'asaas_installments') && (!formData.cpf || !validateCpf(formData.cpf))) {
      newErrors.cpf = 'Informe um CPF válido.';
    }
    if (product?.require_billing_address && (paymentMethod === 'credit_card' || paymentMethod.startsWith('hybrid') || paymentMethod === 'asaas_installments')) {
      const addressVal = validateBillingAddress();
      if (!addressVal.isValid) Object.assign(newErrors, addressVal.errors);
    }
    if (paymentMethod === 'credit_card') {
      Object.assign(newErrors, validateCardFields(cardData));
    } else if (paymentMethod === 'hybrid_pix_card') {
      if (!hybridData.pixAmount || hybridData.pixAmount <= 0) newErrors.pixAmount = 'Informe o valor do Pix.';
      if (!hybridData.cardAmount || hybridData.cardAmount <= 0) newErrors.cardAmount = 'Informe o valor do Cartão.';
      Object.assign(newErrors, validateCardFields(hybridData.cardData));
    } else if (paymentMethod === 'hybrid_two_cards') {
      if (!hybridData.cardAmount || hybridData.cardAmount <= 0) newErrors.cardAmount = 'Informe o valor do Cartão 1.';
      if (!hybridData.card2Amount || hybridData.card2Amount <= 0) newErrors.card2Amount = 'Informe o valor do Cartão 2.';
      Object.assign(newErrors, validateCardFields(hybridData.cardData), validateCardFields(hybridData.card2Data, 'card2'));
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const executeCheckout = async (options = {}) => {
    const activeMethod = options.overrideMethod || paymentMethod;
    const isFallback = Boolean(options.cardFallbackApplied);
    const payload = buildCheckoutPayload({
      formData, paymentMethod: activeMethod, cardData, cryptoData, hybridData, asaasData, product,
      selectedOffer, selectedBumpIds, appliedCoupon, affiliateCode, utmParams,
      proposalCode: proposal?.proposal_code, abTestId, abTestVariant, cardFallbackApplied: isFallback,
      billingAddress,
    });
    const orderResult = await processCheckoutApi(payload);
    setCreatedOrder(orderResult);
    if (orderResult.status === 'paid' && !purchaseTracked.current && (product?.meta_pixel_id || product?.google_ads_id || product?.tiktok_pixel_id)) {
      purchaseTracked.current = true;
      trackPixelPurchase(orderResult, product);
    }
    return orderResult;
  };

  const {
    isFallbackOpen, declinedReason, submittingFallbackPix,
    openFallback, closeFallback, handlePayWithPix, handlePayWithHybrid, handleTryAnotherCard,
  } = useCardDeclinedFallback({
    product, setPaymentMethod, setCardData, submitCheckoutWithMethod: executeCheckout,
  });

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await executeCheckout();
    } catch (err) {
      const isDeclined = err.status === 402 || err.code === 'card_declined' || (err.message && err.message.toLowerCase().includes('recusado'));
      if (isDeclined && (paymentMethod === 'credit_card' || paymentMethod.startsWith('hybrid'))) {
        const opened = openFallback(err.message);
        if (!opened) setSubmitError(err.message);
      } else if (err.status === 429 && paymentMethod !== 'pix') {
        setPaymentMethod('pix');
        setSubmitError(`${err.message} Sugerimos concluir o pagamento via Pix.`);
      } else {
        setSubmitError(err.message || 'Erro ao processar compra. Verifique seus dados e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderPaid = (updated) => {
    setCreatedOrder((prev) => {
      const fullOrder = { ...prev, ...updated, status: 'paid' };
      if (!purchaseTracked.current && (product?.meta_pixel_id || product?.google_ads_id || product?.tiktok_pixel_id)) {
        purchaseTracked.current = true;
        trackPixelPurchase(fullOrder, product);
      }
      return fullOrder;
    });
  };

  const activeUpsell = product?.upsells?.find((u) => u.is_active);
  const hasActiveUpsell = Boolean(activeUpsell);
  const upsellTargetUrl = activeUpsell?.external_url || (createdOrder && product ? `/upsell/${product.slug}?order_code=${createdOrder.order_code}` : '#');
  const postPurchaseTargetUrl = hasActiveUpsell ? upsellTargetUrl : (createdOrder ? `/thank-you/${createdOrder.order_code}` : '#');

  // Redirecionamento automático suave de 3 segundos pós-aprovação do pedido
  useEffect(() => {
    if (!createdOrder || createdOrder.status !== 'paid') return;
    setRedirectCountdown(3);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try { window.location.href = postPurchaseTargetUrl; } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    redirectTimerRef.current = interval;
    return () => { if (redirectTimerRef.current) clearInterval(redirectTimerRef.current); };
  }, [createdOrder?.status, postPurchaseTargetUrl]);

  const hasProposalParam = Boolean(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('proposal'));
  if (loading || (hasProposalParam && loadingProposal)) {
    return <div className="checkout-loading-screen" data-testid="checkout-loading"><Loader2 className="checkout-spinner" size={40} /><p>Carregando oferta segura...</p></div>;
  }

  if (fetchError || !product) {
    return (
      <div className="checkout-error-screen" data-testid="checkout-error">
        <AlertCircle size={48} className="checkout-error-icon" />
        <h2>Oferta não encontrada</h2>
        <p>{fetchError || 'O link acessado é inválido ou a oferta saiu do ar.'}</p>
        <a href="/" className="checkout-back-btn">Voltar para o Início</a>
      </div>
    );
  }

  if (proposal && isProposalExpired(proposal)) {
    return <CheckoutExpiredOfferScreen proposal={proposal} product={product} slug={slug} />;
  }

  if (hasProposalParam && (proposalError || (!proposal && !loadingProposal))) {
    const rawProposalCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('proposal') : '';
    return <CheckoutExpiredOfferScreen proposal={{ proposal_code: rawProposalCode, title: 'Proposta Exclusiva' }} product={product} slug={slug} />;
  }

  if (product && product.is_active === false) {
    return <CheckoutExpiredOfferScreen product={product} slug={slug} isProductInactive={true} />;
  }

  const {
    activeBumps, selectedBumpsList, currentPriceUsd, usdRate,
    methodDiscount, finalTotalBrl, finalTotalUsd, couponForSummary,
  } = calculateCheckoutTotals({ product, selectedOffer, proposal, selectedBumpIds, appliedCoupon, paymentMethod });

  return (
    <div
      className="checkout-page-wrapper"
      data-testid="checkout-page"
      style={{ '--checkout-primary': product?.primary_color || '#0284c7' }}
    >
      {/* Barra de Cronômetro de Escassez */}
      <CheckoutCountdownBar
        enabled={product?.timer_enabled}
        minutes={product?.timer_minutes}
        text={product?.timer_text}
        productId={product?.id}
      />

      {/* Header Seguro */}
      <header className="checkout-navbar">
        <div className="checkout-navbar-inner">
          <div className="checkout-brand">
            {product?.logo_url ? (
              <img
                src={product.logo_url}
                alt={product.name}
                data-testid="checkout-brand-logo"
                style={{ maxHeight: '36px', maxWidth: '200px', objectFit: 'contain' }}
              />
            ) : (
              <span className="checkout-brand-title">Checkout Seguro</span>
            )}
          </div>
          <div className="checkout-security-indicator">
            <Lock size={15} className="checkout-lock-icon" />
            <span>Ambiente Criptografado SSL</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal em Duas Colunas */}
      <main className="checkout-main-container">
        <div className="checkout-grid-layout">
          {/* Coluna Esquerda: Formulários */}
          <div className="checkout-column-forms">
            {createdOrder ? (
              <CheckoutOrderResult
                createdOrder={createdOrder}
                customerName={formData.name}
                onBack={() => setCreatedOrder(null)}
                onOrderPaid={handleOrderPaid}
                hasActiveUpsell={hasActiveUpsell}
                postPurchaseTargetUrl={postPurchaseTargetUrl}
                redirectCountdown={redirectCountdown}
              />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {submitError && (
                  <div
                    className="checkout-submit-error"
                    data-testid="checkout-submit-error"
                    style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <AlertCircle size={16} />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Vídeo de Vendas (Mini-VSL) ou Player de Áudio WhatsApp no Topo (#13) */}
                <CheckoutHeaderMedia product={product} />

                {/* Banner de Proposta Exclusiva (High-Ticket / Closer) */}
                <ProposalCheckoutBanner proposal={proposal} />

                <CheckoutCustomerForm
                  formData={formData}
                  onChange={handleCustomerChange}
                  errors={errors}
                  requireCpf={Boolean(product?.require_cpf)}
                  isPreFilled={isPreFilled}
                />

                {/* Seção de Order Bumps */}
                <CheckoutOrderBump
                  bumps={activeBumps}
                  selectedBumpIds={selectedBumpIds}
                  onToggleBump={handleToggleBump}
                />

                {/* Seção de Cupom de Desconto */}
                <CheckoutCouponBox
                  slug={selectedOffer?.slug || product?.slug}
                  selectedBumpIds={selectedBumpIds}
                  appliedCoupon={couponForSummary}
                  onApplyCoupon={(data) => setAppliedCoupon(data)}
                  onRemoveCoupon={() => setAppliedCoupon(null)}
                />

                <CheckoutPaymentMethods
                  paymentMethod={paymentMethod}
                  onSelectMethod={handleSelectPaymentMethod}
                  allowedPaymentMethod={proposal?.payment_method_allowed}
                  cardData={cardData}
                  onCardChange={handleCardChange}
                  cryptoData={cryptoData}
                  onCryptoChange={handleCryptoChange}
                  hybridData={hybridData}
                  onHybridChange={setHybridData}
                  asaasData={asaasData}
                  onAsaasChange={(inst) => setAsaasData({ installments: inst })}
                  totalPriceBrl={finalTotalBrl}
                  product={product}
                  errors={errors}
                />

                {/* Endereço de Cobrança & Antifraude (ViaCEP) (#21) */}
                {Boolean(product?.require_billing_address) && (paymentMethod === 'credit_card' || paymentMethod.startsWith('hybrid') || paymentMethod === 'asaas_installments') && (
                  <CheckoutBillingAddress billingAddress={billingAddress} onChange={handleAddressChange} onCepBlur={handleCepLookup} errors={addressErrors} loadingCep={loadingCep} cepNotice={cepNotice} />
                )}

                {/* Botão de Finalização */}
                <div className="checkout-action-box">
                  <button type="submit" disabled={submitting} className="checkout-submit-btn" data-testid="checkout-submit-button">
                    {submitting ? (
                      <><Loader2 className="checkout-spinner" size={20} /><span>Processando compra...</span></>
                    ) : (
                      <>
                        <span>
                          {paymentMethod === 'pix' ? `Gerar Pix • ${formatCurrency(finalTotalBrl, 'BRL')}`
                            : paymentMethod === 'credit_card' ? `Pagar com Cartão • ${formatCurrency(finalTotalBrl, 'BRL')}`
                            : paymentMethod === 'asaas_installments' ? `Gerar Carnê Asaas • ${formatCurrency(finalTotalBrl, 'BRL')}`
                            : paymentMethod === 'hybrid_pix_card' ? `Pagar Pix + Cartão • ${formatCurrency(finalTotalBrl, 'BRL')}`
                            : paymentMethod === 'hybrid_two_cards' ? `Pagar com 2 Cartões • ${formatCurrency(finalTotalBrl, 'BRL')}`
                            : `Pagar em Cripto • ${formatCurrency(finalTotalUsd || currentPriceUsd || finalTotalBrl, (finalTotalUsd || currentPriceUsd) ? 'USD' : 'BRL')}`}
                        </span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  <p className="checkout-guarantee-note">🔒 Seus dados financeiros não são armazenados. Transação criptografada de ponta a ponta.</p>
                </div>
              </form>
            )}
          </div>

          {/* Coluna Direita: Resumo do Pedido */}
          <div className="checkout-column-summary">
            <CheckoutOrderSummary
              product={product}
              selectedOffer={selectedOffer}
              paymentMethod={paymentMethod}
              selectedBumps={selectedBumpsList}
              totalOverrideBrl={finalTotalBrl}
              totalOverrideUsd={finalTotalUsd}
              usdRate={usdRate}
              appliedCoupon={couponForSummary}
              paymentMethodDiscount={methodDiscount}
            />
          </div>
        </div>
      </main>

      {/* Pop-up de Desconto Relâmpago ao Sair (Exit-Intent) */}
      <ExitIntentModal
        isOpen={isExitIntentOpen}
        onClose={closeExitIntent}
        onApplyDiscount={handleApplyExitIntent}
        title={product?.exit_intent_title}
        subtitle={product?.exit_intent_subtitle}
        couponCode={product?.exit_intent_coupon_code}
        discountPercent={product?.exit_intent_coupon_discount_percent}
        primaryColor={product?.primary_color}
      />

      {/* Prova Social ao Vivo (Social Proof Toast) */}
      <SocialProofToast
        slug={selectedOffer?.slug || product?.slug || slug}
        enabled={Boolean(product?.enable_social_proof)}
      />

      {/* Fallback Inteligente de Cartão Recusado (#5) */}
      <CardDeclinedFallbackModal
        isOpen={isFallbackOpen}
        onClose={closeFallback}
        onPayWithPix={handlePayWithPix}
        onPayWithHybrid={handlePayWithHybrid}
        onTryAnotherCard={handleTryAnotherCard}
        product={product}
        totalBrl={finalTotalBrl}
        submittingPix={submittingFallbackPix}
        declinedReason={declinedReason}
      />
    </div>
  );
}
