import React, { useState, useEffect, useRef } from 'react';
import { fetchPublicProductApi, processCheckoutApi } from './checkoutApi';
import CheckoutOrderSummary from './CheckoutOrderSummary';
import CheckoutCustomerForm from './CheckoutCustomerForm';
import CheckoutPaymentMethods from './CheckoutPaymentMethods';
import CheckoutOrderResult from './CheckoutOrderResult';
import CheckoutOrderBump from './CheckoutOrderBump';
import CheckoutCountdownBar from './CheckoutCountdownBar';
import CheckoutCouponBox from './CheckoutCouponBox';
import useLeadCapture from '../recovery/useLeadCapture';
import useAffiliateRef from './useAffiliateRef';
import '../../styles/checkout-pix.css';
import '../../styles/checkout-conversion.css';
import '../../styles/checkout-hybrid.css';
import '../../styles/proposals.css';
import ProposalCheckoutBanner from './ProposalCheckoutBanner';
import { useProposal } from './useProposal';
import { validateEmail, validateCpf, formatCurrency, validateCardFields, buildCheckoutPayload } from './checkoutUtils';
import { Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import {
  initMetaPixel,
  trackPixelPageView,
  trackPixelInitiateCheckout,
  trackPixelPurchase,
} from './pixelService';
import { useUtmParams } from './useUtmParams';

export default function CheckoutPage({ slug }) {
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
  const initiateCheckoutTracked = useRef(false);
  const purchaseTracked = useRef(false);

  // Form states
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', phone_ddi: '55', cpf: '' });
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [cardData, setCardData] = useState({ cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '', installments: 1 });
  const [cryptoData, setCryptoData] = useState({ currency: 'USDT', network: 'polygon' });
  const [hybridData, setHybridData] = useState({
    pixAmount: 0,
    cardAmount: 0,
    card2Amount: 0,
    cardData: { cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '', installments: 1 },
    card2Data: { cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '', installments: 1 }
  });
  const [errors, setErrors] = useState({});

  useLeadCapture({ product, selectedOffer, formData, appliedCoupon, selectedBumpIds });
  const affiliateCode = useAffiliateRef(slug);
  const utmParams = useUtmParams();

  const handleProposalLoaded = (prop) => {
    if (!prop) return;
    setFormData((prev) => ({
      ...prev,
      name: prop.customer_name || prev.name,
      email: prop.customer_email || prev.email,
      phone: prop.customer_phone || prev.phone,
      cpf: prop.customer_cpf || prev.cpf,
    }));
    if (prop.payment_method_allowed && prop.payment_method_allowed !== 'all') {
      setPaymentMethod(prop.payment_method_allowed);
    }
    if (prop.payment_method_allowed === 'hybrid_pix_card' && prop.custom_pix_amount_brl && prop.custom_card_amount_brl) {
      setHybridData((prev) => ({
        ...prev,
        pixAmount: prop.custom_pix_amount_brl,
        cardAmount: prop.custom_card_amount_brl,
      }));
    }
  };
  const { proposal } = useProposal(slug, handleProposalLoaded);

  useEffect(() => {
    let isMounted = true;
    async function loadProduct() {
      try {
        setLoading(true);
        setFetchError(null);
        const data = await fetchPublicProductApi(slug);
        if (!isMounted) return;
        setProduct(data);
        if (data.meta_pixel_id) {
          initMetaPixel(data.meta_pixel_id);
          trackPixelPageView();
        }

        // Identifica se o slug acessado é de uma oferta específica
        const matchedOffer = data.offers?.find((o) => o.slug === slug);
        if (matchedOffer) {
          setSelectedOffer(matchedOffer);
        } else {
          // Se acessou pelo slug do produto, busca a oferta padrão ou a primeira
          const defaultOffer = data.offers?.find((o) => o.is_default) || data.offers?.[0];
          if (defaultOffer) setSelectedOffer(defaultOffer);
        }
      } catch (err) {
        if (isMounted) setFetchError(err.message || 'Não foi possível carregar a oferta.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (slug) {
      loadProduct();
    } else {
      setFetchError('Slug de checkout não informado.');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const triggerInitiateCheckout = () => {
    if (!initiateCheckoutTracked.current && product?.meta_pixel_id) {
      initiateCheckoutTracked.current = true;
      trackPixelInitiateCheckout(product, selectedOffer);
    }
  };

  const handleSelectPaymentMethod = (method) => { setPaymentMethod(method); triggerInitiateCheckout(); };
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

    if (product?.require_cpf && (!formData.cpf || !validateCpf(formData.cpf))) {
      newErrors.cpf = 'Informe um CPF válido.';
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
      Object.assign(newErrors, validateCardFields(hybridData.cardData));
      Object.assign(newErrors, validateCardFields(hybridData.card2Data, 'card2'));
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildCheckoutPayload({
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
        proposalCode: proposal?.proposal_code
      });

      const orderResult = await processCheckoutApi(payload);
      setCreatedOrder(orderResult);
      if (orderResult.status === 'paid' && !purchaseTracked.current && product?.meta_pixel_id) {
        purchaseTracked.current = true;
        trackPixelPurchase(orderResult, product);
      }
    } catch (err) {
      setSubmitError(err.message || 'Erro ao processar compra. Verifique seus dados e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderPaid = (updated) => {
    setCreatedOrder((prev) => {
      const fullOrder = { ...prev, ...updated, status: 'paid' };
      if (!purchaseTracked.current && product?.meta_pixel_id) {
        purchaseTracked.current = true;
        trackPixelPurchase(fullOrder, product);
      }
      return fullOrder;
    });
  };

  const activeUpsell = product?.upsells && product.upsells.find((u) => u.is_active);
  const hasActiveUpsell = Boolean(activeUpsell);
  const upsellTargetUrl = activeUpsell?.external_url || (createdOrder && product ? `/upsell/${product.slug}?order_code=${createdOrder.order_code}` : '#');
  const thankYouTargetUrl = createdOrder ? `/thank-you/${createdOrder.order_code}` : '#';
  const postPurchaseTargetUrl = hasActiveUpsell ? upsellTargetUrl : thankYouTargetUrl;

  // Redirecionamento automático suave de 3 segundos pós-aprovação do pedido
  useEffect(() => {
    if (!createdOrder || createdOrder.status !== 'paid') return;

    setRedirectCountdown(3);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            window.location.href = postPurchaseTargetUrl;
          } catch {
            // Fallback seguro para ambiente de testes jsdom
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    redirectTimerRef.current = interval;

    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, [createdOrder?.status, postPurchaseTargetUrl]);

  if (loading) {
    return (
      <div className="checkout-loading-screen" data-testid="checkout-loading">
        <Loader2 className="checkout-spinner" size={40} />
        <p>Carregando oferta segura...</p>
      </div>
    );
  }

  if (fetchError || !product) {
    return (
      <div className="checkout-error-screen" data-testid="checkout-error">
        <AlertCircle size={48} className="checkout-error-icon" />
        <h2>Oferta não encontrada</h2>
        <p>{fetchError || 'O link acessado é inválido ou o produto foi desativado.'}</p>
        <a href="/" className="checkout-back-btn">
          Voltar para o Início
        </a>
      </div>
    );
  }

  const activeBumps = product?.order_bumps?.filter((b) => b.is_active) || [];
  const selectedBumpsList = activeBumps.filter((b) => selectedBumpIds.includes(b.id));
  const bumpsTotalBrl = selectedBumpsList.reduce((acc, b) => acc + (b.price_brl || 0), 0);
  const currentPriceBrl = (proposal && !proposal.is_expired ? proposal.amount_brl : (selectedOffer?.price_brl ?? product.price_brl));
  const currentPriceUsd = selectedOffer?.price_usd ?? product.price_usd;
  const rawTotalBrl = currentPriceBrl + bumpsTotalBrl;
  const usdRate = currentPriceUsd && currentPriceBrl > 0 ? currentPriceUsd / currentPriceBrl : null;
  const rawTotalUsd = currentPriceUsd ? (usdRate ? rawTotalBrl * usdRate : currentPriceUsd) : (rawTotalBrl / 5.0);

  const discountBrl = appliedCoupon ? Math.round(rawTotalBrl * (appliedCoupon.discount_percent / 100) * 100) / 100 : 0;
  const totalWithBumpsBrl = Math.max(0.01, Math.round((rawTotalBrl - discountBrl) * 100) / 100);
  const discountUsd = appliedCoupon && rawTotalUsd ? Math.round(rawTotalUsd * (appliedCoupon.discount_percent / 100) * 100) / 100 : 0;
  const totalWithBumpsUsd = rawTotalUsd ? Math.max(0.01, Math.round((rawTotalUsd - discountUsd) * 100) / 100) : null;

  const couponForSummary = appliedCoupon ? {
    ...appliedCoupon,
    discount_amount_brl: discountBrl,
    discount_amount_usd: discountUsd,
  } : null;

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
                    style={{
                      marginBottom: 16,
                      padding: '10px 14px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      color: '#b91c1c',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Banner de Proposta Exclusiva (High-Ticket / Closer) */}
                <ProposalCheckoutBanner proposal={proposal} />

                <CheckoutCustomerForm
                  formData={formData}
                  onChange={handleCustomerChange}
                  errors={errors}
                  requireCpf={Boolean(product?.require_cpf)}
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
                  cardData={cardData}
                  onCardChange={handleCardChange}
                  cryptoData={cryptoData}
                  onCryptoChange={handleCryptoChange}
                  hybridData={hybridData}
                  onHybridChange={setHybridData}
                  totalPriceBrl={totalWithBumpsBrl}
                  errors={errors}
                />

                {/* Botão de Finalização */}
                <div className="checkout-action-box">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="checkout-submit-btn"
                    data-testid="checkout-submit-button"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="checkout-spinner" size={20} />
                        <span>Processando compra...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {paymentMethod === 'pix'
                            ? `Gerar Pix • ${formatCurrency(totalWithBumpsBrl, 'BRL')}`
                            : paymentMethod === 'credit_card'
                            ? `Pagar com Cartão • ${formatCurrency(totalWithBumpsBrl, 'BRL')}`
                            : paymentMethod === 'hybrid_pix_card'
                            ? `Pagar Pix + Cartão • ${formatCurrency(totalWithBumpsBrl, 'BRL')}`
                            : paymentMethod === 'hybrid_two_cards'
                            ? `Pagar com 2 Cartões • ${formatCurrency(totalWithBumpsBrl, 'BRL')}`
                            : `Pagar em Cripto • ${formatCurrency(totalWithBumpsUsd || currentPriceUsd || totalWithBumpsBrl, (totalWithBumpsUsd || currentPriceUsd) ? 'USD' : 'BRL')}`}
                        </span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <p className="checkout-guarantee-note">
                    🔒 Seus dados financeiros não são armazenados. Transação criptografada de ponta a ponta.
                  </p>
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
              totalOverrideBrl={totalWithBumpsBrl}
              totalOverrideUsd={totalWithBumpsUsd}
              usdRate={usdRate}
              appliedCoupon={couponForSummary}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
