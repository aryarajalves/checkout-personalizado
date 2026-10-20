import React, { useState, useEffect } from 'react';
import { Palette, X, Sparkles } from 'lucide-react';
import { fetchProductAppearanceApi, updateProductAppearanceApi } from '../product-management/productApi';
import BuilderControls from './BuilderControls';
import CheckoutLivePreview from './CheckoutLivePreview';
import '../../styles/checkout-builder.css';

export default function CheckoutBuilderModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [activeTab, setActiveTab] = useState('visual'); // 'visual', 'timer', 'testimonials'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estados Visuais e de Marca
  const [primaryColor, setPrimaryColor] = useState('#0284c7');
  const [logoUrl, setLogoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [logoImgError, setLogoImgError] = useState(false);
  const [coverImgError, setCoverImgError] = useState(false);

  // Estados de Conversão e Cronômetro
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerText, setTimerText] = useState('Esta oferta especial expira em:');

  // Estados de Prova Social (Depoimentos)
  const [testimonials, setTestimonials] = useState([]);

  // Estados de Vídeo de Vendas (Mini-VSL) & Áudio WhatsApp (#13)
  const [headerMediaType, setHeaderMediaType] = useState('none');
  const [headerVideoUrl, setHeaderVideoUrl] = useState('');
  const [headerAudioUrl, setHeaderAudioUrl] = useState('');
  const [headerAudioAuthorName, setHeaderAudioAuthorName] = useState('Mensagem do Especialista');
  const [headerAudioAuthorAvatar, setHeaderAudioAuthorAvatar] = useState('');

  useEffect(() => {
    if (!isOpen || !product) return;
    loadAppearance();
  }, [isOpen, product]);

  const loadAppearance = async () => {
    try {
      setLoading(true);
      const data = await fetchProductAppearanceApi(product.id);
      setPrimaryColor(data.primary_color || '#0284c7');
      setLogoUrl(data.logo_url || '');
      setImageUrl(data.image_url || '');
      setTimerEnabled(Boolean(data.timer_enabled));
      setTimerMinutes(Number(data.timer_minutes) || 15);
      setTimerText(data.timer_text || 'Esta oferta especial expira em:');
      setHeaderMediaType(data.header_media_type || 'none');
      setHeaderVideoUrl(data.header_video_url || '');
      setHeaderAudioUrl(data.header_audio_url || '');
      setHeaderAudioAuthorName(data.header_audio_author_name || 'Mensagem do Especialista');
      setHeaderAudioAuthorAvatar(data.header_audio_author_avatar || '');

      let parsedTestimonials = [];
      if (data.testimonials) {
        try {
          parsedTestimonials = typeof data.testimonials === 'string'
            ? JSON.parse(data.testimonials)
            : data.testimonials;
        } catch {
          parsedTestimonials = [];
        }
      }
      setTestimonials(Array.isArray(parsedTestimonials) ? parsedTestimonials : []);
      setLogoImgError(false);
      setCoverImgError(false);
    } catch (err) {
      if (showFeedback) {
        showFeedback('error', err.message || 'Erro ao carregar configurações visuais.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setSaving(true);
      await updateProductAppearanceApi(product.id, {
        primary_color: primaryColor,
        logo_url: logoUrl.trim() || null,
        image_url: imageUrl.trim() || null,
        timer_enabled: timerEnabled,
        timer_minutes: timerMinutes,
        timer_text: timerText.trim() || 'Esta oferta especial expira em:',
        testimonials: testimonials.length > 0 ? JSON.stringify(testimonials) : null,
        header_media_type: headerMediaType,
        header_video_url: headerVideoUrl.trim() || null,
        header_audio_url: headerAudioUrl.trim() || null,
        header_audio_author_name: headerAudioAuthorName.trim() || 'Mensagem do Especialista',
        header_audio_author_avatar: headerAudioAuthorAvatar.trim() || null,
      });
      if (showFeedback) {
        showFeedback('success', 'Personalização e elementos de conversão salvos com sucesso!');
      }
      onClose();
    } catch (err) {
      if (showFeedback) {
        showFeedback('error', err.message || 'Erro ao salvar personalização visual.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="checkout-builder-overlay"
      data-testid="product-appearance-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="checkout-builder-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-appearance-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Builder */}
        <div className="checkout-builder-header">
          <div className="builder-header-left">
            <div className="builder-header-icon">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="builder-header-title">
                Aparência e Alta Conversão • Editor Visual
              </h3>
              <p className="builder-header-subtitle">
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>

          <div className="builder-header-actions">
            <button
              type="button"
              className="webhooks-close-btn"
              onClick={onClose}
              disabled={saving}
              data-testid="close-appearance-modal-btn"
              title="Fechar editor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo Lado a Lado (Split View) */}
        <div className="checkout-builder-body">
          {/* Lado Esquerdo: Painel de Controles */}
          <BuilderControls
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            logoImgError={logoImgError}
            setLogoImgError={setLogoImgError}
            coverImgError={coverImgError}
            setCoverImgError={setCoverImgError}
            timerEnabled={timerEnabled}
            setTimerEnabled={setTimerEnabled}
            timerMinutes={timerMinutes}
            setTimerMinutes={setTimerMinutes}
            timerText={timerText}
            setTimerText={setTimerText}
            testimonials={testimonials}
            setTestimonials={setTestimonials}
            headerMediaType={headerMediaType}
            setHeaderMediaType={setHeaderMediaType}
            headerVideoUrl={headerVideoUrl}
            setHeaderVideoUrl={setHeaderVideoUrl}
            headerAudioUrl={headerAudioUrl}
            setHeaderAudioUrl={setHeaderAudioUrl}
            headerAudioAuthorName={headerAudioAuthorName}
            setHeaderAudioAuthorName={setHeaderAudioAuthorName}
            headerAudioAuthorAvatar={headerAudioAuthorAvatar}
            setHeaderAudioAuthorAvatar={setHeaderAudioAuthorAvatar}
            saving={saving}
            onClose={onClose}
            onSubmit={handleSubmit}
          />

          {/* Lado Direito: Live Preview Interativo (Desktop & Mobile) */}
          <CheckoutLivePreview
            product={product}
            primaryColor={primaryColor}
            logoUrl={logoUrl}
            imageUrl={imageUrl}
            timerEnabled={timerEnabled}
            timerMinutes={timerMinutes}
            timerText={timerText}
            testimonials={testimonials}
            headerMediaType={headerMediaType}
            headerVideoUrl={headerVideoUrl}
            headerAudioUrl={headerAudioUrl}
            headerAudioAuthorName={headerAudioAuthorName}
            headerAudioAuthorAvatar={headerAudioAuthorAvatar}
          />
        </div>
      </div>
    </div>
  );
}
