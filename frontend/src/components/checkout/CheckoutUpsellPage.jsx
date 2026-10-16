import React, { useState, useEffect } from 'react';
import { fetchPublicProductApi } from './checkoutApi';
import { formatCurrency } from './checkoutUtils';
import { trackPixelPurchase } from './pixelService';
import { CheckCircle, AlertTriangle, ShieldCheck, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';

export default function CheckoutUpsellPage({ slug }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionDone, setActionDone] = useState(false);
  const [actionType, setActionType] = useState(null); // 'accepted' | 'declined'

  useEffect(() => {
    async function loadUpsell() {
      try {
        setLoading(true);
        const data = await fetchPublicProductApi(slug);
        setProduct(data);
      } catch (err) {
        setError(err.message || 'Erro ao carregar detalhes do UpSell.');
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadUpsell();
    }
  }, [slug]);

  const activeUpsell = product?.upsells?.find((u) => u.is_active);
  const orderCode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('order_code')
    : null;
  const thankYouTarget = orderCode ? `/thank-you/${orderCode}` : (product?.thank_you_url || '/');

  const handleAcceptUpsell = () => {
    // Dispara evento de Pixel Purchase para o UpSell se houver pixel configurado
    if (product?.meta_pixel_id && activeUpsell) {
      trackPixelPurchase(
        {
          order_code: `UPSELL-${Date.now()}`,
          amount_brl: activeUpsell.price_brl,
        },
        product
      );
    }

    if (activeUpsell?.external_url) {
      window.location.href = activeUpsell.external_url;
      return;
    }

    setActionType('accepted');
    setActionDone(true);
  };

  const handleDeclineUpsell = () => {
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
          {actionType === 'accepted' ? (
            <>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={36} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                🎉 Oferta Adicionada com Sucesso!
              </h2>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
                Parabéns! A oferta exclusiva foi adicionada com sucesso ao seu pedido.
              </p>
            </>
          ) : (
            <>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={36} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Pedido Principal Confirmado!
              </h2>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
                Tudo certo! Seu produto principal está garantido e o comprovante está disponível a seguir.
              </p>
            </>
          )}

          <a
            href={orderCode ? `/thank-you/${orderCode}` : (product?.thank_you_url || '/')}
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
          <a
            href={thankYouTarget}
            data-testid="upsell-empty-conclude-btn"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Avançar para a Página de Obrigado
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-wrapper" data-testid="checkout-upsell-page" style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', paddingBottom: '60px' }}>
      {/* Barra de Aviso Superior */}
      <div style={{ backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <AlertTriangle size={18} />
        <span>ATENÇÃO: NÃO FECHE ESTA PÁGINA AINDA! OPORTUNIDADE ÚNICA E EXCLUSIVA</span>
      </div>

      <div style={{ maxWidth: '780px', margin: '40px auto 0', padding: '0 20px' }}>
        {/* Card Principal da Oferta */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', padding: '36px 28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#fbbf24', padding: '4px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '20px' }}>
            <Sparkles size={14} />
            <span>Oferta Especial de Apenas 1 Clique</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', lineHeight: 1.25, marginBottom: '12px' }}>
            {activeUpsell.title}
          </h1>

          {activeUpsell.subtitle && (
            <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 28px', lineHeight: 1.5 }}>
              {activeUpsell.subtitle}
            </p>
          )}

          {/* Mídia: Vídeo ou Imagem */}
          {activeUpsell.video_url ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', marginBottom: '28px', backgroundColor: '#000000' }}>
              <iframe
                src={activeUpsell.video_url}
                title="Vídeo de Apresentação"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : activeUpsell.image_url ? (
            <div style={{ marginBottom: '28px' }}>
              <img
                src={activeUpsell.image_url}
                alt={activeUpsell.title}
                style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '12px', objectFit: 'cover' }}
              />
            </div>
          ) : null}

          {/* Descrição em Texto */}
          {activeUpsell.description && (
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '28px', fontSize: '14.5px', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {activeUpsell.description}
            </div>
          )}

          {/* Chamada de Preço */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Leve por apenas:
            </span>
            <div style={{ fontSize: '38px', fontWeight: 900, color: '#22c55e', marginTop: '4px' }}>
              {formatCurrency(activeUpsell.price_brl, 'BRL')}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Pagamento único • Sem mensalidades adicionais
            </span>
          </div>

          {/* Botão de Aceite */}
          <button
            type="button"
            onClick={handleAcceptUpsell}
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
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px rgba(34, 197, 94, 0.4)',
              transition: 'transform 0.15s ease',
            }}
          >
            <span>SIM, QUERO APROVEITAR ESTA OFERTA AGORA!</span>
            <ArrowRight size={22} />
          </button>

          {/* Link de Recusa */}
          <div style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleDeclineUpsell}
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
              Não, obrigado. Prefiro abrir mão deste desconto exclusivo e ir para o produto principal.
            </button>
          </div>

          {/* Selo de Garantia */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '28px', color: '#94a3b8', fontSize: '12.5px' }}>
            <ShieldCheck size={16} color="#22c55e" />
            <span>Satisfação Garantida ou 100% do seu dinheiro de volta em até 7 dias.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
