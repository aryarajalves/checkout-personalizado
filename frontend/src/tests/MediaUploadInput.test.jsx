import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import MediaUploadInput from '../components/common/MediaUploadInput';

describe('MediaUploadInput Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza label, input de texto e botão de upload para áudio', () => {
    render(
      <MediaUploadInput
        label="Áudio do Especialista"
        value=""
        onChange={vi.fn()}
        mediaType="audio"
        testId="test-audio-upload"
      />
    );

    expect(screen.getByText('Áudio do Especialista')).toBeInTheDocument();
    expect(screen.getByTestId('test-audio-upload')).toBeInTheDocument();
    expect(screen.getByTestId('test-audio-upload-btn-upload')).toHaveTextContent('Upload Áudio');
  });

  it('renderiza botão customizado para vídeo e permite alteração manual de URL', () => {
    const handleChange = vi.fn();
    render(
      <MediaUploadInput
        label="Vídeo Mini-VSL"
        value=""
        onChange={handleChange}
        mediaType="video"
        buttonText="Enviar Vídeo"
        testId="test-video-upload"
      />
    );

    expect(screen.getByTestId('test-video-upload-btn-upload')).toHaveTextContent('Enviar Vídeo');

    const input = screen.getByTestId('test-video-upload');
    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=12345678901' } });
    expect(handleChange).toHaveBeenCalledWith('https://youtube.com/watch?v=12345678901');
  });

  it('exibe pré-visualização e player de áudio quando há URL de áudio configurada', () => {
    const handleChange = vi.fn();
    render(
      <MediaUploadInput
        label="Áudio WhatsApp"
        value="/api/v1/uploads/recado.mp3"
        onChange={handleChange}
        mediaType="audio"
        testId="test-audio-preview"
      />
    );

    expect(screen.getByTestId('test-audio-preview-preview-card')).toBeInTheDocument();
    expect(screen.getByText('Áudio Pronto para Reprodução')).toBeInTheDocument();
    expect(screen.getByTestId('test-audio-preview-audio-player-preview')).toBeInTheDocument();

    // Botão de remover limpa o áudio
    fireEvent.click(screen.getByTestId('test-audio-preview-btn-remove-preview'));
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('exibe pré-visualização e player de vídeo quando há MP4 direto configurado', () => {
    render(
      <MediaUploadInput
        label="Vídeo Mini-VSL"
        value="/api/v1/uploads/apresentacao.mp4"
        onChange={vi.fn()}
        mediaType="video"
        testId="test-video-preview"
      />
    );

    expect(screen.getByTestId('test-video-preview-preview-card')).toBeInTheDocument();
    expect(screen.getByText('Vídeo Pronto para Exibição')).toBeInTheDocument();
    expect(screen.getByTestId('test-video-preview-video-player-preview')).toBeInTheDocument();
  });

  it('bloqueia arquivos maiores que 50MB com mensagem de erro clara', async () => {
    render(
      <MediaUploadInput
        label="Vídeo Grande"
        value=""
        onChange={vi.fn()}
        mediaType="video"
        testId="test-large-file"
      />
    );

    const fileInput = screen.getByTestId('test-large-file-file-input');
    const largeFile = new File(['x'.repeat(100)], 'video_gigante.mp4', { type: 'video/mp4' });
    Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 }); // 60MB

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/maior que o limite de 50MB/i)).toBeInTheDocument();
    });
  });

  it('faz upload de arquivo com sucesso e dispara onChange com a URL retornada', async () => {
    const handleChange = vi.fn();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: '/api/v1/uploads/novo_audio_123.mp3' }),
    });

    render(
      <MediaUploadInput
        label="Áudio Upload"
        value=""
        onChange={handleChange}
        mediaType="audio"
        testId="test-upload-success"
      />
    );

    const fileInput = screen.getByTestId('test-upload-success-file-input');
    const audioFile = new File(['dummy audio content'], 'audio_teste.mp3', { type: 'audio/mpeg' });

    fireEvent.change(fileInput, { target: { files: [audioFile] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/uploads', expect.objectContaining({
        method: 'POST',
      }));
      expect(handleChange).toHaveBeenCalledWith('/api/v1/uploads/novo_audio_123.mp3');
    });
  });
});
