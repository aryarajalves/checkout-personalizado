import React from 'react';
import { Palette, Timer, MessageSquareQuote, Image as ImageIcon, Sparkles, Check, Film } from 'lucide-react';
import TestimonialsEditor from '../product-management/TestimonialsEditor';
import TimerConfigSection from '../product-management/TimerConfigSection';
import HeaderMediaConfigSection from './HeaderMediaConfigSection';
import ImageUploadInput from '../common/ImageUploadInput';

const PRESET_COLORS = [
  { name: 'Azul Confiança', hex: '#0284c7' },
  { name: 'Verde Conversão', hex: '#16a34a' },
  { name: 'Roxo Autoridade', hex: '#7c3aed' },
  { name: 'Dourado Premium', hex: '#d97706' },
  { name: 'Vermelho Urgência', hex: '#dc2626' },
  { name: 'Chumbo Minimalista', hex: '#0f172a' },
];

export default function BuilderControls({
  activeTab,
  setActiveTab,
  primaryColor,
  setPrimaryColor,
  logoUrl,
  setLogoUrl,
  imageUrl,
  setImageUrl,
  logoImgError,
  setLogoImgError,
  coverImgError,
  setCoverImgError,
  timerEnabled,
  setTimerEnabled,
  timerMinutes,
  setTimerMinutes,
  timerText,
  setTimerText,
  testimonials,
  setTestimonials,
  headerMediaType,
  setHeaderMediaType,
  headerVideoUrl,
  setHeaderVideoUrl,
  headerAudioUrl,
  setHeaderAudioUrl,
  headerAudioAuthorName,
  setHeaderAudioAuthorName,
  headerAudioAuthorAvatar,
  setHeaderAudioAuthorAvatar,
  saving,
  onClose,
  onSubmit,
}) {
  return (
    <div className="builder-controls-pane" data-testid="builder-controls-pane">
      {/* Abas dos Controles */}
      <div className="builder-controls-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('visual')}
          data-testid="tab-appearance-visual"
          className={`builder-tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
        >
          <Palette size={15} />
          <span>Visual & Capa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          data-testid="tab-appearance-timer"
          className={`builder-tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
        >
          <Timer size={15} />
          <span>Cronômetro</span>
          {timerEnabled && (
            <span className="builder-tab-badge active">
              Ativo
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('testimonials')}
          data-testid="tab-appearance-testimonials"
          className={`builder-tab-btn ${activeTab === 'testimonials' ? 'active' : ''}`}
        >
          <MessageSquareQuote size={15} />
          <span>Depoimentos</span>
          {testimonials && testimonials.length > 0 && (
            <span className="builder-tab-badge active">
              {testimonials.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          data-testid="tab-appearance-media"
          className={`builder-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
        >
          <Film size={15} />
          <span>Vídeo / Áudio</span>
          {headerMediaType && headerMediaType !== 'none' && (
            <span className="builder-tab-badge active">
              Ativo
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div className="builder-controls-content">
        {activeTab === 'visual' && (
          <div>
            {/* 1. Capa do Produto */}
            <ImageUploadInput
              label="Imagem de Capa do Produto"
              value={imageUrl}
              onChange={(val) => {
                setImageUrl(val);
                setCoverImgError(false);
              }}
              placeholder="https://exemplo.com/capa-produto.jpg"
              helperText="Exibida no topo e no resumo do pedido do checkout. Cole a URL ou envie um arquivo do computador."
              testId="input-appearance-cover-url"
            />

            {imageUrl && !coverImgError && (
              <div
                style={{
                  marginTop: '-8px',
                  marginBottom: '16px',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#f8fafc',
                }}
                data-testid="cover-preview-box"
              >
                <img
                  src={imageUrl}
                  alt="Preview Capa"
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                  onError={() => setCoverImgError(true)}
                />
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>✓ Capa Carregada</span>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Visualizando no preview ao lado</div>
                </div>
              </div>
            )}

            {/* 2. Logotipo da Marca / Expert */}
            <ImageUploadInput
              label="Logotipo da Marca ou Expert"
              value={logoUrl}
              onChange={(val) => {
                setLogoUrl(val);
                setLogoImgError(false);
              }}
              placeholder="https://exemplo.com/logo-empresa.png"
              helperText="Substitui o título textual no cabeçalho do checkout. Cole a URL ou envie o logo."
              testId="input-appearance-logo-url"
            />

            {logoUrl && !logoImgError && (
              <div
                style={{
                  marginTop: '-8px',
                  marginBottom: '16px',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#f8fafc',
                }}
                data-testid="logo-preview-box"
              >
                <img
                  src={logoUrl}
                  alt="Preview Logo"
                  style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }}
                  onError={() => setLogoImgError(true)}
                />
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>✓ Logo Carregado</span>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Atualizado no preview ao vivo</div>
                </div>
              </div>
            )}

            {/* 3. Cor Primária da Marca */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Cor Primária de Destaque
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    data-testid={`preset-color-${preset.hex.replace('#', '')}`}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: primaryColor.toLowerCase() === preset.hex.toLowerCase() ? `2px solid ${preset.hex}` : '1px solid #e2e8f0',
                      backgroundColor: primaryColor.toLowerCase() === preset.hex.toLowerCase() ? `${preset.hex}10` : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: preset.hex,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Seletor Customizado Hex */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: '38px',
                    height: '38px',
                    padding: 0,
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                  data-testid="input-appearance-color-picker"
                />
                <input
                  type="text"
                  className="form-control-modern"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#0284c7"
                  style={{ width: '130px', fontFamily: 'monospace', fontWeight: 600 }}
                  data-testid="input-appearance-color-text"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timer' && (
          <TimerConfigSection
            timerEnabled={timerEnabled}
            setTimerEnabled={setTimerEnabled}
            timerMinutes={timerMinutes}
            setTimerMinutes={setTimerMinutes}
            timerText={timerText}
            setTimerText={setTimerText}
          />
        )}

        {activeTab === 'testimonials' && (
          <TestimonialsEditor
            testimonials={testimonials}
            onChange={setTestimonials}
          />
        )}

        {activeTab === 'media' && (
          <HeaderMediaConfigSection
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
          />
        )}
      </div>

      {/* Footer com Botões */}
      <div className="builder-controls-footer">
        <button
          type="button"
          className="secondary-action-btn"
          onClick={onClose}
          disabled={saving}
          data-testid="close-appearance-modal-btn"
        >
          Cancelar
        </button>

        <button
          type="button"
          className="primary-action-btn"
          onClick={onSubmit}
          disabled={saving}
          data-testid="btn-save-appearance"
          style={{
            backgroundColor: primaryColor || '#0284c7',
            borderColor: primaryColor || '#0284c7',
          }}
        >
          {saving ? (
            <span>Salvando...</span>
          ) : (
            <>
              <Check size={16} />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
