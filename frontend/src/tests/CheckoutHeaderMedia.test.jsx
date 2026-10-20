import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import CheckoutHeaderMedia, { parseVideoEmbedUrl } from '../components/checkout/CheckoutHeaderMedia';

describe('CheckoutHeaderMedia & parseVideoEmbedUrl (#13)', () => {
  it('converte corretamente URLs do YouTube em embed seguro', () => {
    const watchUrl = parseVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(watchUrl.type).toBe('iframe');
    expect(watchUrl.src).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');

    const shortUrl = parseVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(shortUrl.type).toBe('iframe');
    expect(shortUrl.src).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('converte corretamente URLs do Vimeo em player seguro', () => {
    const vimeoUrl = parseVideoEmbedUrl('https://vimeo.com/76979871');
    expect(vimeoUrl.type).toBe('iframe');
    expect(vimeoUrl.src).toContain('https://player.vimeo.com/video/76979871');
  });

  it('detecta URLs diretas de vídeo (MP4, WebM)', () => {
    const directUrl = parseVideoEmbedUrl('https://cdn.exemplo.com/videos/vsl.mp4');
    expect(directUrl.type).toBe('direct');
    expect(directUrl.src).toBe('https://cdn.exemplo.com/videos/vsl.mp4');
  });

  it('não renderiza nada quando header_media_type é "none"', () => {
    const { container } = render(
      <CheckoutHeaderMedia
        product={{
          id: 1,
          name: 'Curso Teste',
          header_media_type: 'none',
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('não renderiza nada se o produto for nulo ou sem URLs configuradas', () => {
    const { container } = render(<CheckoutHeaderMedia product={null} />);
    expect(container.firstChild).toBeNull();

    const { container: emptyContainer } = render(
      <CheckoutHeaderMedia
        product={{
          id: 1,
          header_media_type: 'video',
          header_video_url: '',
        }}
      />
    );
    expect(emptyContainer.firstChild).toBeNull();
  });

  it('renderiza iframe quando header_media_type é "video" com link do YouTube', () => {
    render(
      <CheckoutHeaderMedia
        product={{
          id: 1,
          name: 'Curso Teste',
          header_media_type: 'video',
          header_video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }}
      />
    );

    const videoWrapper = screen.getByTestId('checkout-header-video');
    expect(videoWrapper).toBeInTheDocument();

    const iframe = screen.getByTestId('checkout-video-iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('renderiza tag video direto quando header_media_type é "video" com arquivo MP4', () => {
    render(
      <CheckoutHeaderMedia
        product={{
          id: 1,
          name: 'Curso Teste',
          header_media_type: 'video',
          header_video_url: 'https://cdn.exemplo.com/vsl_oficial.mp4',
        }}
      />
    );

    const videoElement = screen.getByTestId('checkout-direct-video-player');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement.src).toBe('https://cdn.exemplo.com/vsl_oficial.mp4');
  });

  it('renderiza player de áudio WhatsApp quando header_media_type é "audio"', () => {
    render(
      <CheckoutHeaderMedia
        product={{
          id: 1,
          name: 'Mentoria Exclusiva',
          header_media_type: 'audio',
          header_audio_url: 'https://cdn.exemplo.com/audio/recado.mp3',
          header_audio_author_name: 'Dr. João Silva',
          header_audio_author_avatar: 'https://cdn.exemplo.com/fotos/joao.jpg',
        }}
      />
    );

    expect(screen.getByTestId('checkout-header-audio')).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-audio-player')).toBeInTheDocument();
    expect(screen.getByText('Dr. João Silva')).toBeInTheDocument();
  });

  it('renderiza tanto o vídeo quanto o áudio simultaneamente quando header_media_type é "both"', () => {
    render(
      <CheckoutHeaderMedia
        product={{
          id: 1,
          name: 'Mentoria Completa',
          header_media_type: 'both',
          header_video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          header_audio_url: 'https://cdn.exemplo.com/audio/recado.mp3',
          header_audio_author_name: 'Dra. Ana Paula',
          header_audio_author_avatar: 'https://cdn.exemplo.com/fotos/ana.jpg',
        }}
      />
    );

    // Verifica que ambos os containers de mídia foram renderizados juntos
    expect(screen.getByTestId('checkout-header-media-group')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-header-video')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-video-iframe')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-header-audio')).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-audio-player')).toBeInTheDocument();
    expect(screen.getByText('Dra. Ana Paula')).toBeInTheDocument();
  });
});

