import React from 'react';
import { Video, Mic, VolumeX, Sparkles, Film, Headphones } from 'lucide-react';
import ImageUploadInput from '../common/ImageUploadInput';
import MediaUploadInput from '../common/MediaUploadInput';

export default function HeaderMediaConfigSection({
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
}) {
  return (
    <div className="builder-media-config" data-testid="builder-media-config-section">
      <div className="builder-section-intro">
        <h4 className="builder-section-title">
          <Sparkles size={16} color="#d97706" />
          <span>Mídia de Humanização no Topo do Checkout</span>
        </h4>
        <p className="builder-section-desc">
          Quebre objeções finais de última hora apresentando um vídeo explicativo rápido (Mini-VSL) ou uma nota de voz humanizada no estilo WhatsApp.
        </p>
      </div>

      {/* Seletor de Tipo de Mídia */}
      <div className="builder-media-type-selector" data-testid="media-type-selector">
        <label className="builder-field-label">Tipo de Destaque no Topo:</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            className={`builder-media-choice-btn ${headerMediaType === 'none' ? 'active' : ''}`}
            onClick={() => setHeaderMediaType('none')}
            data-testid="media-choice-none"
            style={{
              padding: '10px 8px',
              border: headerMediaType === 'none' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              backgroundColor: headerMediaType === 'none' ? '#f0f9ff' : '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <VolumeX size={16} color={headerMediaType === 'none' ? '#0284c7' : '#64748b'} />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: headerMediaType === 'none' ? '#0369a1' : '#334155' }}>
              Nenhum
            </span>
          </button>

          <button
            type="button"
            className={`builder-media-choice-btn ${headerMediaType === 'video' ? 'active' : ''}`}
            onClick={() => setHeaderMediaType('video')}
            data-testid="media-choice-video"
            style={{
              padding: '10px 8px',
              border: headerMediaType === 'video' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              backgroundColor: headerMediaType === 'video' ? '#f0f9ff' : '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Film size={16} color={headerMediaType === 'video' ? '#0284c7' : '#64748b'} />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: headerMediaType === 'video' ? '#0369a1' : '#334155' }}>
              Apenas Vídeo
            </span>
          </button>

          <button
            type="button"
            className={`builder-media-choice-btn ${headerMediaType === 'audio' ? 'active' : ''}`}
            onClick={() => setHeaderMediaType('audio')}
            data-testid="media-choice-audio"
            style={{
              padding: '10px 8px',
              border: headerMediaType === 'audio' ? '2px solid #16a34a' : '1px solid #cbd5e1',
              backgroundColor: headerMediaType === 'audio' ? '#f0fdf4' : '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Mic size={16} color={headerMediaType === 'audio' ? '#16a34a' : '#64748b'} />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: headerMediaType === 'audio' ? '#15803d' : '#334155' }}>
              Apenas Áudio
            </span>
          </button>

          <button
            type="button"
            className={`builder-media-choice-btn ${headerMediaType === 'both' ? 'active' : ''}`}
            onClick={() => setHeaderMediaType('both')}
            data-testid="media-choice-both"
            style={{
              padding: '10px 8px',
              border: headerMediaType === 'both' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
              backgroundColor: headerMediaType === 'both' ? '#f5f3ff' : '#ffffff',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} color={headerMediaType === 'both' ? '#7c3aed' : '#64748b'} />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: headerMediaType === 'both' ? '#6d28d9' : '#334155' }}>
              Vídeo + Áudio
            </span>
          </button>
        </div>
      </div>

      {/* 1. Configurações para VÍDEO (Mini-VSL) */}
      {(headerMediaType === 'video' || headerMediaType === 'both') && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: headerMediaType === 'both' ? '1px dashed #cbd5e1' : 'none', paddingTop: headerMediaType === 'both' ? '14px' : 0 }}>
          {headerMediaType === 'both' && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Film size={14} />
              <span>1. Vídeo de Conversão (Topo do Checkout)</span>
            </div>
          )}
          <MediaUploadInput
            label="Vídeo de Conversão (Mini-VSL)"
            value={headerVideoUrl}
            onChange={setHeaderVideoUrl}
            mediaType="video"
            placeholder="https://www.youtube.com/watch?v=... ou faça upload do vídeo"
            helperText="Envie um vídeo (.mp4, .webm) do seu computador ou cole um link do YouTube, Vimeo ou PandaVideo."
            testId="input-header-video-url"
            buttonText="Upload Vídeo"
          />
        </div>
      )}

      {/* 2. Configurações para ÁUDIO ESTILO WHATSAPP */}
      {(headerMediaType === 'audio' || headerMediaType === 'both') && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: headerMediaType === 'both' ? '1px dashed #cbd5e1' : 'none', paddingTop: headerMediaType === 'both' ? '14px' : 0 }}>
          {headerMediaType === 'both' && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Mic size={14} />
              <span>2. Mensagem de Voz WhatsApp (Abaixo do Vídeo)</span>
            </div>
          )}
          <MediaUploadInput
            label="Arquivo de Áudio (MP3, WAV, OGG, AAC)"
            value={headerAudioUrl}
            onChange={setHeaderAudioUrl}
            mediaType="audio"
            placeholder="https://seusite.com/audio.mp3 ou faça upload do áudio"
            helperText="Envie um áudio gravado (.mp3, .wav, .ogg, .m4a) do seu computador ou informe a URL direta."
            testId="input-header-audio-url"
            buttonText="Upload Áudio"
          />

          <div>
            <label className="builder-field-label">Nome do Especialista / Autor do Áudio:</label>
            <input
              type="text"
              className="builder-text-input"
              value={headerAudioAuthorName}
              onChange={(e) => setHeaderAudioAuthorName(e.target.value)}
              placeholder="Ex: Dr. Roberto Silva ou Mensagem do Especialista"
              data-testid="input-header-audio-author-name"
              style={{ width: '100%', marginTop: '4px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <ImageUploadInput
            label="Foto de Perfil / Avatar do Especialista"
            value={headerAudioAuthorAvatar}
            onChange={(val) => setHeaderAudioAuthorAvatar(val)}
            placeholder="https://seusite.com/fotos/dr-roberto.jpg"
            helperText="Foto circular exibida com o selo verde de mensagem de voz no WhatsApp."
            testId="input-header-audio-author-avatar"
          />
        </div>
      )}
    </div>
  );
}
