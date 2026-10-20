import React, { useState, useEffect, useRef } from 'react';
import { fetchPublicProductApi, executeOneClickBuyApi, fetchOrderByCodeApi, checkOrderStatusApi } from './checkoutApi';
import { formatCurrency } from './checkoutUtils';
import { trackPixelPurchase } from './pixelService';
import { CheckCircle, AlertTriangle, ShieldCheck, ArrowRight, Loader2, Sparkles, ArrowDownRight } from 'lucide-react';
import UpsellPixModal from './UpsellPixModal';

export default function CheckoutUpsellPage({ slug }) {
  const [product, setProduct] = useState(null);
  const [parentOrder, setParentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 'upsell' ou 'downsell'
  const [currentStep, setCurrentStep] = useState('upsell');
  const [processingOneClick, setProcessingOneClick] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [actionType, setActionType] = useState(null); // 'accepted' | 'declined'

  // Pix Modal State (Opção A)
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState(null);
  const pollingRef = useRef(null);

  const orderCode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('order_code')
    : null;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchPublicProductApi(slug);
        setProduct(data);

        if (orderCode) {
          try {
            const ord = await fetchOrderByCodeApi(orderCode);
            setParentOrder(ord);
          } catch (ordErr) {
            console.warn('Não foi possível carregar pedido pai antecipadamente:', ordErr);
          }
        }
      } catch (err) {
        setError(err.message || 'Erro ao carregar detalhes do UpSell.');
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadData();
    }
  }, [slug, orderCode]);

  // Limpa polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const activeUpsell = product?.upsells?.find((u) => u.is_active);

  // Oferta ativa dependendo do step ('upsell' ou 'downsell')
  const isDownsell = currentStep === 'downsell';
  const offerTitle = isDownsell ? (activeUpsell?.downsell_title || activeUpsell?.title) : activeUpsell?.title;
  const offerSubtitle = isDownsell ? (activeUpsell?.downsell_subtitle || activeUpsell?.subtitle) : activeUpsell?.subtitle;
  const offerDescription = isDownsell ? (activeUpsell?.downsell_description || activeUpsell?.description) : activeUpsell?.description;
  const offerPrice = isDownsell ? (activeUpsell?.downsell_price_brl || activeUpsell?.price_brl) : activeUpsell?.price_brl;
  const offerVideoUrl = isDownsell ? (activeUpsell?.downsell_video_url || activeUpsell?.video_url) : activeUpsell?.video_url;
  const offerImageUrl = isDownsell ? (activeUpsell?.downsell_image_url || activeUpsell?.image_url) : activeUpsell?.image_url;
  const offerExternalUrl = isDownsell ? (activeUpsell?.downsell_external_url || activeUpsell?.external_url) : activeUpsell?.external_url;

  const thankYouTarget = orderCode ? `/thank-you/${orderCode}` : (product?.thank_you_url || '/');

  const startPollingChildOrder = (childOrderCode) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const statusData = await fetchOrderByCodeApi(childOrderCode);
        if (statusData && statusData.status === 'paid') {
          clearInterval(pollingRef.current);
          setPixModalOpen(false);
          setActionType('accepted');
          setActionDone(true);
        }
      } catch (pollErr) {
        console.error('Erro no polling do Pix de upsell:', pollErr);
      }
    }, 3000);
  };

  const handleAcceptOffer = async (paymentMethodOverride = null) => {
    // 1. Redirecionamento externo se configurado
    if (offerExternalUrl) {
      window.location.href = offerExternalUrl;
      return;
    }

    // Se não há order_code de origem (visualização pura), simula aceite
    if (!orderCode) {
      setActionType('accepted');
      setActionDone(true);
      return;
    }

    const effectiveMethod = paymentMethodOverride || parentOrder?.payment_method || 'credit_card';

    try {
      setProcessingOneClick(true);
      const res = await executeOneClickBuyApi({
        order_code: orderCode,
        offer_type: currentStep,
        payment_method: effectiveMethod,
      });

      // Dispara evento Pixel Purchase se houver pixel configurado
      if (product?.meta_pixel_id || product?.google_ads_id || product?.tiktok_pixel_id) {
        trackPixelPurchase(
          {
            order_code: res.order_code,
            amount_brl: res.amount_brl,
          },
          product
        );
      }

      if (res.status === 'paid') {
        // Cobrança no Cartão aprovada em 1 clique
        setActionType('accepted');
        setActionDone(true);
      } else if (res.status === 'pending' && res.payment_method === 'pix') {
        // Opção A: Comprador Pix visualiza modal instantâneo com QR Code
        setPixData(res);
        setPixModalOpen(true);
        startPollingChildOrder(res.order_code);
      } else {
        setActionType('accepted');
        setActionDone(true);
      }
    } catch (err) {
      alert(err.message || 'Não foi possível processar a compra especial. Tente novamente.');
    } finally {
      setProcessingOneClick(false);
    }
  };

  const handleDeclineOffer = () => {
    // Se está no UpSell e o produto possui Downsell habilitado, transiciona para o Downsell!
    if (currentStep === 'upsell' && activeUpsell?.enable_downsell) {
      setCurrentStep('downsell');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Se recusou o Downsell (ou não possui Downsell), conclui para obrigado
    setActionType('declined');
    setActionDone(true);
  };

  if (loading) {
    return (
      <div className="checkout-loading-screen" data-testid="upsell-loading">
        <Loader2 className="checkout-spinner" size={40} />
        <p>Carregando sua oferta exclusiva...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="checkout-error-screen" data-testid="upsell-error">
        <h2>Página não encontrada</h2>
        <p>{error || 'Esta oferta expirou ou não está mais disponível.'}</p>
        <a href="/" className="checkout-back-btn">Voltar para o Início</a>
      </div>
    );
  }

  if (actionDone) {
    return (
      <div className="checkout-page-wrapper" data-testid="upsell-result-screen" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '520px', width: '100%', backgroundColor: '#ffffff', borderRadius: '16px', padding: '36px 28px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: actionType === 'accepted' ? '#dcfce7' : '#f1f5f9', color: actionType === 'accepted' ? '#16a34a' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            {actionType === 'accepted' ? '🎉 Oferta Confirmada com Sucesso!' : 'Pedido Principal Confirmado!'}
          </h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
            {actionType === 'accepted'
              ? 'Parabéns! Sua compra especial foi adicionada e aprovada com sucesso.'
              : 'Tudo certo! Seu pedido principal está garantido e o comprovante está disponível a seguir.'}
          </p>

          <a
            href={thankYouTarget}
            data-testid="upsell-to-thank-you-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              width: '100%',
            }}
          >
            <span>Continuar para a Página de Obrigado</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  if (!activeUpsell) {
    return (
      <div className="checkout-page-wrapper" data-testid="upsell-empty" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '500px', width: '100%', backgroundColor: '#ffffff', borderRadius: '16px', padding: '36px 28px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <CheckCircle size={48} color="#16a34a" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Obrigado pela sua compra!
          </h2>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
            Seu pedido do produto <strong>{product.name}</strong> foi registrado com sucesso.
          </p>
          <a href={thankYouTarget} data-testid="upsell-empty-conclude-btn" style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            Avançar para a Página de Obrigado
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-wrapper" data-testid="checkout-upsell-page" style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', paddingBottom: '60px' }}>
      {/* Barra de Aviso Superior */}
      <div style={{ backgroundColor: isDownsell ? '#b45309' : '#dc2626', color: '#ffffff', padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <AlertTriangle size={18} />
        <span>
          {isDownsell
            ? 'ÚLTIMA CHANCE: NÃO FECHE ESTA PÁGINA! PREPARAMOS UMA CONDIÇÃO ÚNICA PARA VOCÊ'
            : 'ATENÇÃO: NÃO FECHE ESTA PÁGINA AINDA! OPORTUNIDADE ÚNICA E EXCLUSIVA'}
        </span>
      </div>

      <div style={{ maxWidth: '780px', margin: '40px auto 0', padding: '0 20px' }}>
        {/* Card Principal da Oferta */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', padding: '36px 28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: isDownsell ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)', border: `1px solid ${isDownsell ? '#22c55e' : '#f59e0b'}`, color: isDownsell ? '#4ade80' : '#fbbf24', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '20px' }}>
            {isDownsell ? <ArrowDownRight size={14} /> : <Sparkles size={14} />}
            <span>{isDownsell ? 'Oferta de Downsell Especial' : 'Oferta Especial de 1 Clique'}</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', lineHeight: 1.25, marginBottom: '12px' }} data-testid="upsell-offer-title">
            {offerTitle}
          </h1>

          {offerSubtitle && (
            <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 28px', lineHeight: 1.5 }} data-testid="upsell-offer-subtitle">
              {offerSubtitle}
            </p>
          )}

          {/* Mídia: Vídeo ou Imagem */}
          {offerVideoUrl ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', marginBottom: '28px', backgroundColor: '#000000' }}>
              <iframe
                src={offerVideoUrl}
                title="Vídeo de Apresentação"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : offerImageUrl ? (
            <div style={{ marginBottom: '28px' }}>
              <img
                src={offerImageUrl}
                alt={offerTitle}
                style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '12px', objectFit: 'cover' }}
              />
            </div>
          ) : null}

          {/* Descrição em Texto */}
          {offerDescription && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '28px', fontSize: '14.5px', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-line' }} data-testid="upsell-offer-description">
              {offerDescription}
            </div>
          )}

          {/* Chamada de Preço */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isDownsell ? 'Preço Exclusivo de Downsell:' : 'Leve por apenas:'}
            </span>
            <div style={{ fontSize: '38px', fontWeight: 900, color: '#22c55e', marginTop: '4px' }} data-testid="upsell-offer-price">
              {formatCurrency(offerPrice, 'BRL')}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Pagamento único • Sem mensalidades adicionais
            </span>
          </div>

          {/* Botão de Aceite */}
          <button
            type="button"
            onClick={() => handleAcceptOffer()}
            disabled={processingOneClick}
            data-testid="accept-upsell-btn"
            style={{
              width: '100%',
              padding: '18px 24px',
              backgroundColor: '#16a34a',
              backgroundImage: 'linear-gradient(135deg, #22c55e, #15803d)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 800,
              cursor: processingOneClick ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px rgba(34, 197, 94, 0.4)',
              transition: 'transform 0.15s ease',
            }}
          >
            {processingOneClick ? (
              <>
                <Loader2 size={22} className="spinning-icon" />
                <span>PROCESSANDO COBRANÇA EM 1 CLIQUE...</span>
              </>
            ) : (
              <>
                <span>SIM, QUERO APROVEITAR ESTA OFERTA AGORA!</span>
                <ArrowRight size={22} />
              </>
            )}
          </button>

          {/* Link de Recusa */}
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleDeclineOffer}
              disabled={processingOneClick}
              data-testid="decline-upsell-btn"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '6px 12px',
              }}
            >
              {isDownsell
                ? 'Não, obrigado. Prefiro abrir mão desta última oferta e ir para o produto principal.'
                : 'Não, obrigado. Prefiro abrir mão deste desconto exclusivo e ir para o produto principal.'}
            </button>
          </div>

          {/* Selo de Garantia */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '28px', color: '#94a3b8', fontSize: '12.5px' }}>
            <ShieldCheck size={16} color="#22c55e" />
            <span>Satisfação Garantida ou 100% do seu dinheiro de volta em até 7 dias.</span>
          </div>
        </div>
      </div>

      {/* Modal de Pix Instantâneo para Compradores Pix (Opção A) */}
      <UpsellPixModal
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        pixData={pixData}
        onSwitchToCard={() => {
          setPixModalOpen(false);
          handleAcceptOffer('credit_card');
        }}
      />
    </div>
  );
}
