import React, { useState, useEffect } from 'react';
import { Palette, X, Check, Image as ImageIcon, Sparkles, Timer, MessageSquareQuote } from 'lucide-react';
import { fetchProductAppearanceApi, updateProductAppearanceApi } from './productApi';
import TestimonialsEditor from './TestimonialsEditor';
import TimerConfigSection from './TimerConfigSection';

const PRESET_COLORS = [
  { name: 'Azul Confiança', hex: '#0284c7' },
  { name: 'Verde Conversão', hex: '#16a34a' },
  { name: 'Roxo Autoridade', hex: '#7c3aed' },
  { name: 'Dourado Premium', hex: '#d97706' },
  { name: 'Vermelho Urgência', hex: '#dc2626' },
  { name: 'Chumbo Minimalista', hex: '#0f172a' },
];

export function ProductAppearanceModal({
  product,
  isOpen,
  onClose,
  showFeedback,
}) {
  const [activeTab, setActiveTab] = useState('visual'); // 'visual', 'timer', 'testimonials'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Tab 1: Visual & Capa
  const [primaryColor, setPrimaryColor] = useState('#0284c7');
  const [logoUrl, setLogoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [logoImgError, setLogoImgError] = useState(false);
  const [coverImgError, setCoverImgError] = useState(false);

  // Tab 2: Cronômetro
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerText, setTimerText] = useState('Esta oferta especial expira em:');

  // Tab 3: Depoimentos
  const [testimonials, setTestimonials] = useState([]);

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

      // Parse testimonials JSON if string
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
      showFeedback('error', err.message || 'Erro ao carregar aparência do checkout.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      });
      showFeedback('success', 'Personalização e elementos de conversão salvos com sucesso!');
      onClose();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao salvar personalização visual.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="webhooks-modal-overlay"
      data-testid="product-appearance-modal-overlay"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="webhooks-modal-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="product-appearance-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px' }}
      >
        {/* Cabeçalho */}
        <div className="webhooks-modal-header">
          <div className="webhooks-header-title-box">
            <div className="webhooks-header-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <Palette size={22} />
            </div>
            <div>
              <h3 className="webhooks-header-title">Aparência e Alta Conversão</h3>
              <p className="webhooks-header-subtitle">
                Produto: <strong>{product.name}</strong> • (/pay/{product.slug})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="webhooks-close-btn"
            onClick={onClose}
            disabled={saving}
            data-testid="close-appearance-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '0 16px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            data-testid="tab-appearance-visual"
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'visual' ? '#7c3aed' : '#64748b',
              borderBottom: activeTab === 'visual' ? '2px solid #7c3aed' : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Palette size={15} />
            <span>Visual & Capa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timer')}
            data-testid="tab-appearance-timer"
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'timer' ? '#ea580c' : '#64748b',
              borderBottom: activeTab === 'timer' ? '2px solid #ea580c' : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Timer size={15} />
            <span>Cronômetro</span>
            {timerEnabled && (
              <span style={{ fontSize: '10px', backgroundColor: '#fed7aa', color: '#c2410c', padding: '1px 5px', borderRadius: '4px' }}>
                Ativo
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testimonials')}
            data-testid="tab-appearance-testimonials"
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: activeTab === 'testimonials' ? '#7c3aed' : '#64748b',
              borderBottom: activeTab === 'testimonials' ? '2px solid #7c3aed' : '2px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <MessageSquareQuote size={15} />
            <span>Depoimentos</span>
            {testimonials.length > 0 && (
              <span style={{ fontSize: '10px', backgroundColor: '#ede9fe', color: '#6d28d9', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                {testimonials.length}
              </span>
            )}
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <div className="spinning-icon" style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #ede9fe', borderTopColor: '#7c3aed', borderRadius: '50%' }} />
              <p style={{ marginTop: '12px', fontSize: '13px' }}>Carregando dados de personalização...</p>
            </div>
          ) : (
            <>
              {/* ABA 1: VISUAL & CAPA */}
              {activeTab === 'visual' && (
                <div>
                  {/* Capa do Produto */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Imagem de Capa do Produto no Checkout (Opcional)
                    </label>
                    <input
                      type="url"
                      className="form-control-modern"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setCoverImgError(false);
                      }}
                      placeholder="https://seusite.com/capa-produto.jpg"
                      data-testid="input-appearance-cover-url"
                      style={{ width: '100%', fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Exibida no cartão de resumo do pedido ao lado dos detalhes do produto.
                    </span>

                    {imageUrl.trim() && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                        data-testid="cover-preview-box"
                      >
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Prévia da Capa:</span>
                        {coverImgError ? (
                          <span style={{ fontSize: '12px', color: '#ef4444' }}>Erro ao carregar imagem. Verifique a URL.</span>
                        ) : (
                          <img
                            src={imageUrl}
                            alt="Preview Capa"
                            onError={() => setCoverImgError(true)}
                            style={{ height: '44px', width: '44px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Logotipo do Expert */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Logotipo da Marca ou Expert no Cabeçalho (Opcional)
                    </label>
                    <input
                      type="url"
                      className="form-control-modern"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setLogoImgError(false);
                      }}
                      placeholder="https://seusite.com/logo-expert.png"
                      data-testid="input-appearance-logo-url"
                      style={{ width: '100%', fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Substitui o título textual no cabeçalho do checkout.
                    </span>

                    {logoUrl.trim() && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                        data-testid="logo-preview-box"
                      >
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Prévia do Logo:</span>
                        {logoImgError ? (
                          <span style={{ fontSize: '12px', color: '#ef4444' }}>Erro ao carregar logotipo.</span>
                        ) : (
                          <img
                            src={logoUrl}
                            alt="Preview Logo"
                            onError={() => setLogoImgError(true)}
                            style={{ maxHeight: '32px', maxWidth: '140px', objectFit: 'contain' }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cor Primária */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Cor Principal da Marca (Botões e Destaques)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        data-testid="input-appearance-color-picker"
                        style={{ width: '38px', height: '38px', padding: '0', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: 'none' }}
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#0284c7"
                        maxLength={7}
                        data-testid="input-appearance-color-text"
                        className="form-control-modern"
                        style={{ width: '110px', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setPrimaryColor(c.hex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 9px',
                            borderRadius: '6px',
                            border: primaryColor.toLowerCase() === c.hex.toLowerCase() ? '2px solid #0f172a' : '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                          data-testid={`preset-color-${c.hex.replace('#', '')}`}
                        >
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.hex }} />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview do Botão */}
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                      <Sparkles size={13} style={{ color: primaryColor }} />
                      <span>Prévia do Botão no Checkout</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: primaryColor,
                        color: '#ffffff',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      data-testid="button-live-preview"
                    >
                      Pagar Agora com Segurança
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: CRONÔMETRO DE ESCASSEZ */}
              {activeTab === 'timer' && (
                <TimerConfigSection
                  timerEnabled={timerEnabled}
                  setTimerEnabled={setTimerEnabled}
                  timerMinutes={timerMinutes}
                  setTimerMinutes={setTimerMinutes}
                  timerText={timerText}
                  setTimerText={setTimerText}
                  primaryColor={primaryColor}
                />
              )}

              {/* ABA 3: DEPOIMENTOS */}
              {activeTab === 'testimonials' && (
                <TestimonialsEditor
                  testimonials={testimonials}
                  onChange={setTestimonials}
                />
              )}

              {/* Rodapé de Ações */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  className="webhooks-btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="webhooks-btn-primary"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  disabled={saving}
                  data-testid="btn-save-appearance"
                >
                  <Check size={14} />
                  <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
