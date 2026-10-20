import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Video, Headphones, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MediaUploadInput({
  label,
  value,
  onChange,
  placeholder = 'Cole a URL ou envie um arquivo...',
  helperText,
  mediaType = 'audio',
  accept,
  testId = 'media-upload-input',
  buttonText,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const defaultAccept = mediaType === 'video'
    ? 'video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov'
    : 'audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/opus,.mp3,.wav,.ogg,.m4a,.aac,.opus';

  const defaultButtonText = buttonText || (mediaType === 'video' ? 'Upload Vídeo' : 'Upload Áudio');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tamanho no cliente (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('O arquivo selecionado é maior que o limite de 50MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/v1/uploads', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Falha ao processar o upload do arquivo.');
      }

      if (data.url) {
        onChange(data.url);
      }
    } catch (err) {
      console.error('Erro no upload de mídia:', err);
      setUploadError(err.message || 'Erro ao enviar arquivo para o servidor.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isDirectVideo = value && (
    value.includes('/api/v1/uploads/') ||
    value.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)
  );

  const isAudio = mediaType === 'audio' || (value && value.match(/\.(mp3|wav|ogg|m4a|aac|opus)(\?.*)?$/i));

  return (
    <div style={{ marginBottom: '16px' }} data-testid={`${testId}-wrapper`}>
      {label && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
          {label}
        </label>
      )}

      {/* Barra de Ações: Input URL + Botão Upload do Computador */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control-modern"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={testId}
          style={{ flex: 1, fontSize: '12.5px', padding: '9px 12px' }}
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept || defaultAccept}
          style={{ display: 'none' }}
          data-testid={`${testId}-file-input`}
        />

        <button
          type="button"
          className="secondary-action-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid={`${testId}-btn-upload`}
          style={{
            padding: '9px 14px',
            fontSize: '12.5px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: mediaType === 'video' ? '#f0f9ff' : '#f0fdf4',
            borderColor: mediaType === 'video' ? '#bae6fd' : '#bbf7d0',
            color: mediaType === 'video' ? '#0369a1' : '#15803d',
            cursor: uploading ? 'wait' : 'pointer',
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          title={mediaType === 'video' ? 'Fazer upload de vídeo do computador (MP4, WebM)' : 'Fazer upload de áudio do computador (MP3, WAV, OGG)'}
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="spinning-icon" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Upload size={15} />
              <span>{defaultButtonText}</span>
            </>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="btn-icon-action"
            title="Limpar mídia"
            data-testid={`${testId}-btn-clear`}
            style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Card de Pré-visualização da Mídia Configurada */}
      {value && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
          data-testid={`${testId}-preview-card`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="#16a34a" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                {mediaType === 'video' ? 'Vídeo Pronto para Exibição' : 'Áudio Pronto para Reprodução'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onChange('')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#ef4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
              data-testid={`${testId}-btn-remove-preview`}
            >
              Remover
            </button>
          </div>

          {/* Player nativo de áudio para teste imediato */}
          {isAudio && (
            <div style={{ marginTop: '2px' }}>
              <audio
                controls
                src={value}
                style={{ width: '100%', height: '36px', borderRadius: '6px' }}
                data-testid={`${testId}-audio-player-preview`}
              />
            </div>
          )}

          {/* Player nativo de vídeo se for MP4/WebM direto */}
          {mediaType === 'video' && isDirectVideo && (
            <div style={{ marginTop: '2px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000000', maxHeight: '160px', display: 'flex', justifyContent: 'center' }}>
              <video
                controls
                src={value}
                style={{ maxHeight: '160px', width: '100%', objectFit: 'contain' }}
                data-testid={`${testId}-video-player-preview`}
              />
            </div>
          )}

          {/* URL truncada informativa */}
          <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>
            {value}
          </div>
        </div>
      )}

      {helperText && (
        <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
          {helperText}
        </p>
      )}

      {uploadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0 0', color: '#dc2626', fontSize: '12px' }}>
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
