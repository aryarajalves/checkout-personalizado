import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Lock,
  Star,
  Timer,
  CheckCircle2,
  CreditCard,
  QrCode,
  Coins,
} from 'lucide-react';
import CheckoutHeaderMedia from '../checkout/CheckoutHeaderMedia';
import LiveTestimonialsList from './LiveTestimonialsList';

export default function CheckoutLivePreview({
  product,
  primaryColor,
  logoUrl,
  imageUrl,
  timerEnabled,
  timerMinutes,
  timerText,
  testimonials,
  headerMediaType,
  headerVideoUrl,
  headerAudioUrl,
  headerAudioAuthorName,
  headerAudioAuthorAvatar,
}) {
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [logoError, setLogoError] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const productPrice = formatBRL(product?.price_brl || 97.0);

  return (
    <div className="builder-preview-pane" data-testid="checkout-live-preview-pane">
      {/* Toolbar Superior */}
      <div className="preview-top-toolbar">
        <div className="preview-mode-switch">
          <button
            type="button"
            className={`preview-mode-btn ${previewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setPreviewMode('desktop')}
            data-testid="btn-preview-mode-desktop"
            title="Visualização em Computador / Desktop"
          >
            <Monitor size={15} />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            className={`preview-mode-btn ${previewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setPreviewMode('mobile')}
            data-testid="btn-preview-mode-mobile"
            title="Visualização em Smartphone / Celular"
          >
            <Smartphone size={15} />
            <span>Mobile</span>
          </button>
        </div>

        <div className="preview-live-indicator">
          <span className="preview-live-dot" />
          <span>Ao Vivo (Tempo Real)</span>
        </div>

        {product?.slug && (
          <a
            href={`/pay/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="preview-open-link"
            data-testid="link-open-real-checkout"
            title="Abrir página real do checkout"
          >
            <ExternalLink size={13} />
            <span>Página Real</span>
          </a>
        )}
      </div>

      {/* Palco de Visualização */}
      <div className="preview-stage-container">
        {previewMode === 'desktop' ? (
          /* ================= MODO DESKTOP ================= */
          <div className="preview-desktop-frame" data-testid="frame-desktop-view">
            <div className="preview-browser-bar">
              <div className="preview-browser-dots">
                <span className="preview-browser-dot dot-red" />
                <span className="preview-browser-dot dot-yellow" />
                <span className="preview-browser-dot dot-green" />
              </div>
              <div className="preview-browser-url">
                https://seusite.com/pay/{product?.slug || 'checkout'}
              </div>
            </div>

            <div className="preview-checkout-viewport">
              {renderCheckoutContent({
                product,
                primaryColor,
                logoUrl,
                logoError,
                setLogoError,
                imageUrl,
                coverError,
                setCoverError,
                timerEnabled,
                timerMinutes,
                timerText,
                testimonials,
                headerMediaType,
                headerVideoUrl,
                headerAudioUrl,
                headerAudioAuthorName,
                headerAudioAuthorAvatar,
                productPrice,
                formatBRL,
              })}
            </div>
          </div>
        ) : (
          /* ================= MODO MOBILE (SMARTPHONE) ================= */
          <div className="preview-mobile-frame" data-testid="frame-mobile-view">
            <div className="mobile-notch-island" />
            <div className="mobile-status-bar">
              <span>09:41</span>
              <span>5G • 100%</span>
            </div>

            <div className="preview-checkout-viewport" style={{ paddingBottom: '24px' }}>
              {renderCheckoutContent({
                product,
                primaryColor,
                logoUrl,
                logoError,
                setLogoError,
                imageUrl,
                coverError,
                setCoverError,
                timerEnabled,
                timerMinutes,
                timerText,
                testimonials,
                headerMediaType,
                headerVideoUrl,
                headerAudioUrl,
                headerAudioAuthorName,
                headerAudioAuthorAvatar,
                productPrice,
                formatBRL,
              })}
            </div>
            <div className="mobile-home-indicator" />
          </div>
        )}
      </div>
    </div>
  );
}

function renderCheckoutContent({
  product,
  primaryColor,
  logoUrl,
  logoError,
  setLogoError,
  imageUrl,
  coverError,
  setCoverError,
  timerEnabled,
  timerMinutes,
  timerText,
  testimonials,
  headerMediaType,
  headerVideoUrl,
  headerAudioUrl,
  headerAudioAuthorName,
  headerAudioAuthorAvatar,
  productPrice,
}) {
  return (
    <div>
      {/* 1. Header do Checkout com Logo ou Título */}
      <div className="live-checkout-navbar" data-testid="live-checkout-navbar">
        {logoUrl && !logoError ? (
          <img
            src={logoUrl}
            alt="Logo Marca"
            className="live-logo-img"
            onError={() => setLogoError(true)}
            data-testid="live-preview-logo-img"
          />
        ) : (
          <span className="live-brand-title" data-testid="live-preview-brand-title">
            {product?.name || 'Checkout Seguro'}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '11px', fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>Ambiente Seguro</span>
        </div>
      </div>

      {/* 2. Barra de Cronômetro de Escassez */}
      {timerEnabled && (
        <div className="live-timer-bar" data-testid="live-preview-timer-bar">
          <Timer size={14} color="#ea580c" />
          <span>{timerText || 'Esta oferta especial expira em:'}</span>
          <span className="live-timer-badge" data-testid="live-timer-countdown">
            {String(timerMinutes || 15).padStart(2, '0')}:00
          </span>
        </div>
      )}

      {/* 2.5 Mídia no Topo do Checkout (Vídeo Mini-VSL ou Áudio WhatsApp) */}
      <CheckoutHeaderMedia
        product={{
          ...product,
          header_media_type: headerMediaType,
          header_video_url: headerVideoUrl,
          header_audio_url: headerAudioUrl,
          header_audio_author_name: headerAudioAuthorName,
          header_audio_author_avatar: headerAudioAuthorAvatar,
        }}
      />

      <div className="live-checkout-card">
        {/* 3. Hero do Produto e Preço */}
        <div className="live-product-hero" data-testid="live-product-hero">
          {imageUrl && !coverError && (
            <img
              src={imageUrl}
              alt="Capa Produto"
              className="live-cover-thumb"
              onError={() => setCoverError(true)}
              data-testid="live-preview-cover-img"
            />
          )}
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>
              {product?.name || 'Produto Especial'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {productPrice}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>à vista ou até 12x</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                Pix
              </span>
              <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                Cartão
              </span>
              {testimonials && (Array.isArray(testimonials) ? testimonials.length : 0) > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    color: '#ca8a04',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    marginLeft: '2px',
                  }}
                  data-testid="live-hero-rating-badge"
                >
                  <Star size={11} fill="#eab308" color="#eab308" />
                  <span>5.0 ({(Array.isArray(testimonials) ? testimonials.length : 0)} avaliações)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Etapas Simuladas do Formulário */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: primaryColor,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              1
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Seus Dados</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '32px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 10px', display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
              Nome Completo
            </div>
            <div style={{ height: '32px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 10px', display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
              seu@email.com
            </div>
            <div style={{ height: '32px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 10px', display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
              🇧🇷 +55 (11) 99999-9999
            </div>
          </div>
        </div>

        {/* 5. Forma de Pagamento */}
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: primaryColor,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              2
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Pagamento</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
            <div style={{ border: `1.5px solid ${primaryColor}`, borderRadius: '6px', padding: '8px 4px', textAlign: 'center', background: '#f8fafc' }}>
              <QrCode size={16} color={primaryColor} style={{ margin: '0 auto 2px' }} />
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>Pix</div>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 4px', textAlign: 'center' }}>
              <CreditCard size={16} color="#64748b" style={{ margin: '0 auto 2px' }} />
              <div style={{ fontSize: '11px', color: '#64748b' }}>Cartão</div>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 4px', textAlign: 'center' }}>
              <Coins size={16} color="#64748b" style={{ margin: '0 auto 2px' }} />
              <div style={{ fontSize: '11px', color: '#64748b' }}>Cripto</div>
            </div>
          </div>

          {/* Botão de Ação com Cor Primária Dinâmica */}
          <button
            type="button"
            className="live-action-btn"
            style={{
              backgroundColor: primaryColor || '#0284c7',
              boxShadow: `0 4px 14px ${primaryColor}40`,
            }}
            data-testid="live-preview-action-btn"
          >
            <Lock size={14} />
            <span>Pagar Agora • {productPrice}</span>
          </button>
        </div>

        {/* 6. Depoimentos de Clientes (se cadastrados) */}
        <LiveTestimonialsList testimonials={testimonials} />

        {/* 7. Garantia e Rodapé Seguro */}
        <div style={{ textAlign: 'center', marginTop: '16px', color: '#94a3b8', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' }}>
            <CheckCircle2 size={13} color="#16a34a" />
            <span style={{ color: '#475569', fontWeight: 600 }}>Garantia Incondicional de 7 Dias</span>
          </div>
          <span>Seus dados estão protegidos com criptografia SSL 256-bit</span>
        </div>
      </div>
    </div>
  );
}
