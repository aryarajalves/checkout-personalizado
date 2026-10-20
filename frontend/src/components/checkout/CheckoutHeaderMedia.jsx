import React from 'react';
import WhatsAppAudioPlayer from './WhatsAppAudioPlayer';
import '../../styles/checkout-header-media.css';

export function parseVideoEmbedUrl(rawUrl) {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  // 1. YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`
    };
  }

  // 2. Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'iframe',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  // 3. Vídeo Direto (MP4, WebM, OGG)
  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return {
      type: 'direct',
      src: url
    };
  }

  // 4. PandaVideo ou outros iframes já embutíveis
  if (url.includes('player.vimeo') || url.includes('youtube.com/embed') || url.includes('pandavideo') || url.includes('b-cdn.net')) {
    return {
      type: 'iframe',
      src: url
    };
  }

  // Fallback para iframe genérico
  return {
    type: 'iframe',
    src: url
  };
}

export default function CheckoutHeaderMedia({ product }) {
  if (!product) return null;

  const mediaType = product.header_media_type || 'none';
  if (mediaType === 'none') return null;

  const showVideo = (mediaType === 'video' || mediaType === 'both') && Boolean(product.header_video_url);
  const showAudio = (mediaType === 'audio' || mediaType === 'both') && Boolean(product.header_audio_url);

  if (!showVideo && !showAudio) return null;

  const videoData = showVideo ? parseVideoEmbedUrl(product.header_video_url) : null;

  return (
    <div className="checkout-header-media-wrapper" data-testid="checkout-header-media-group">
      {/* 1. Vídeo de Vendas (Mini-VSL) */}
      {showVideo && videoData && (
        <div className="checkout-video-container" data-testid="checkout-header-video">
          {videoData.type === 'direct' ? (
            <video
              src={videoData.src}
              controls
              playsInline
              preload="metadata"
              className="checkout-direct-video"
              data-testid="checkout-direct-video-player"
            />
          ) : (
            <iframe
              src={videoData.src}
              title={product.name || 'Vídeo de Vendas'}
              className="checkout-video-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              data-testid="checkout-video-iframe"
            />
          )}
        </div>
      )}

      {/* 2. Áudio estilo WhatsApp */}
      {showAudio && (
        <div className="checkout-header-audio-container" data-testid="checkout-header-audio">
          <WhatsAppAudioPlayer
            audioUrl={product.header_audio_url}
            authorName={product.header_audio_author_name || 'Mensagem do Especialista'}
            authorAvatar={product.header_audio_author_avatar}
          />
        </div>
      )}
    </div>
  );
}
