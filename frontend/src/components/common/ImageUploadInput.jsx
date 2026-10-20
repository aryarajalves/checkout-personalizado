import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle2, Loader2 } from 'lucide-react';

export default function ImageUploadInput({
  label,
  value,
  onChange,
  placeholder = 'https://exemplo.com/imagem.png',
  helperText,
  testId = 'image-upload-input',
  accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        throw new Error(data.detail || 'Falha ao enviar imagem.');
      }

      if (data.url) {
        onChange(data.url);
      }
    } catch (err) {
      console.error('Erro no upload de imagem:', err);
      // Fallback seguro com FileReader em base64 se houver instabilidade de rede
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onChange(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      } catch (readErr) {
        setUploadError(err.message || 'Erro ao carregar arquivo de imagem.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ marginBottom: '16px' }} data-testid={`${testId}-wrapper`}>
      {label && (
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
          {label}
        </label>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control-modern"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={testId}
          style={{ flex: 1, fontSize: '12.5px' }}
        />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
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
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f8fafc',
            borderColor: '#cbd5e1',
            color: '#334155',
            cursor: uploading ? 'wait' : 'pointer',
          }}
          title="Fazer upload de imagem do seu computador"
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="spinning-icon" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Upload size={14} color="#0284c7" />
              <span>Upload Arquivo</span>
            </>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="btn-icon-action"
            title="Limpar imagem"
            data-testid={`${testId}-btn-clear`}
            style={{ color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Pré-visualização da imagem/logo renderizada quando há URL/arquivo */}
      {value && (
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
          }}
          data-testid={`${testId}-preview-card`}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={value}
              alt="Pré-visualização renderizada"
              data-testid={`${testId}-preview-img`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div
              style={{
                display: 'none',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '9px',
                textAlign: 'center',
                padding: '2px',
              }}
            >
              Erro ao carregar
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
              <CheckCircle2 size={13} color="#16a34a" />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#16a34a' }}>
                Imagem / Logo Renderizada
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={value}
            >
              {value}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onChange('')}
            className="secondary-action-btn"
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              color: '#ef4444',
              borderColor: '#fecaca',
              backgroundColor: '#fff',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Remover esta imagem"
            data-testid={`${testId}-btn-remove-preview`}
          >
            Remover
          </button>
        </div>
      )}

      {helperText && (
        <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#64748b' }}>
          {helperText}
        </p>
      )}

      {uploadError && (
        <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#ef4444' }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}
