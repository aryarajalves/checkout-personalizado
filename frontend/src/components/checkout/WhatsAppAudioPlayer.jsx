import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, CheckCheck } from 'lucide-react';
import '../../styles/checkout-header-media.css';

const WAVE_BARS = [
  12, 18, 26, 14, 28, 22, 16, 30, 24, 18,
  12, 26, 32, 20, 14, 28, 22, 16, 24, 30,
  18, 12, 22, 28, 16, 20, 14, 26, 18, 12
];

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function WhatsAppAudioPlayer({
  audioUrl,
  authorName = 'Mensagem do Especialista',
  authorAvatar,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (index) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const targetTime = (index / WAVE_BARS.length) * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) : 0;
  const currentBarIndex = Math.floor(progressPercent * WAVE_BARS.length);

  return (
    <div className="whatsapp-audio-card" data-testid="whatsapp-audio-player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header com Avatar do Autor */}
      <div className="whatsapp-audio-header">
        <div className="whatsapp-avatar-wrapper">
          {authorAvatar && !avatarError ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="whatsapp-author-avatar"
              onError={() => setAvatarError(true)}
              data-testid="whatsapp-author-avatar"
            />
          ) : (
            <div className="whatsapp-avatar-fallback">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="whatsapp-mic-badge" title="Mensagem de voz gravada">
            <Mic size={10} color="#ffffff" />
          </div>
        </div>

        <div className="whatsapp-author-info">
          <div className="whatsapp-author-name-row">
            <span className="whatsapp-author-name">{authorName}</span>
            <span className="whatsapp-voice-tag">Recado em Áudio</span>
          </div>
          <span className="whatsapp-author-sub">Toque para ouvir a mensagem</span>
        </div>
      </div>

      {/* Player de Onda Sonora */}
      <div className="whatsapp-player-body">
        <button
          type="button"
          onClick={togglePlay}
          className={`whatsapp-play-btn ${isPlaying ? 'playing' : ''}`}
          data-testid="whatsapp-play-btn"
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? <Pause size={18} fill="#ffffff" color="#ffffff" /> : <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />}
        </button>

        {/* Ondas Sonoras Interativas */}
        <div className="whatsapp-waveform-container" data-testid="whatsapp-waveform">
          {WAVE_BARS.map((height, i) => {
            const isPlayed = i <= currentBarIndex;
            return (
              <span
                key={i}
                className={`whatsapp-wave-bar ${isPlayed ? 'played' : ''}`}
                style={{ height: `${height}px` }}
                onClick={() => handleSeek(i)}
                data-testid={`wave-bar-${i}`}
              />
            );
          })}
        </div>

        {/* Botão de Velocidade */}
        <button
          type="button"
          onClick={toggleSpeed}
          className="whatsapp-speed-btn"
          data-testid="whatsapp-speed-btn"
          title="Alternar velocidade"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Rodapé do Player com Tempo e Checkmarks */}
      <div className="whatsapp-player-footer">
        <span className="whatsapp-time-display" data-testid="whatsapp-time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div className="whatsapp-status-receipt" title="Mensagem de voz ouvida">
          <CheckCheck size={14} color="#53bdeb" />
        </div>
      </div>
    </div>
  );
}
