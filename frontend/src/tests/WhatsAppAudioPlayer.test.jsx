import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import WhatsAppAudioPlayer from '../components/checkout/WhatsAppAudioPlayer';

describe('WhatsAppAudioPlayer Component (#13)', () => {
  beforeEach(() => {
    // Mock HTMLMediaElement play and pause
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('renderiza o player com nome do autor, tag de recado e tempo inicial', () => {
    render(
      <WhatsAppAudioPlayer
        audioUrl="https://cdn.exemplo.com/audio.mp3"
        authorName="Dra. Roberta Santos"
      />
    );

    expect(screen.getByTestId('whatsapp-audio-player')).toBeInTheDocument();
    expect(screen.getByText('Dra. Roberta Santos')).toBeInTheDocument();
    expect(screen.getByText('Recado em Áudio')).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-time-display')).toHaveTextContent('0:00 / 0:00');
  });

  it('exibe inicial do autor como fallback quando não há foto de avatar', () => {
    render(
      <WhatsAppAudioPlayer
        audioUrl="https://cdn.exemplo.com/audio.mp3"
        authorName="Carlos Menezes"
      />
    );

    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('alterna reprodução e pausa ao clicar no botão verde de play', async () => {
    render(
      <WhatsAppAudioPlayer
        audioUrl="https://cdn.exemplo.com/audio.mp3"
        authorName="Dr. Felipe"
      />
    );

    const playBtn = screen.getByTestId('whatsapp-play-btn');
    expect(playBtn).toBeInTheDocument();

    // Inicia play
    fireEvent.click(playBtn);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

    // Aguarda o botão entrar em estado 'playing'
    const { waitFor } = await import('@testing-library/react');
    await waitFor(() => {
      expect(playBtn).toHaveClass('playing');
    });

    // Pausa
    fireEvent.click(playBtn);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('alterna a velocidade de reprodução entre 1x, 1.5x e 2x', () => {
    render(
      <WhatsAppAudioPlayer
        audioUrl="https://cdn.exemplo.com/audio.mp3"
        authorName="Dr. Felipe"
      />
    );

    const speedBtn = screen.getByTestId('whatsapp-speed-btn');
    expect(speedBtn).toHaveTextContent('1x');

    fireEvent.click(speedBtn);
    expect(speedBtn).toHaveTextContent('1.5x');

    fireEvent.click(speedBtn);
    expect(speedBtn).toHaveTextContent('2x');

    fireEvent.click(speedBtn);
    expect(speedBtn).toHaveTextContent('1x');
  });

  it('renderiza as barras de ondas sonoras interativas', () => {
    render(
      <WhatsAppAudioPlayer
        audioUrl="https://cdn.exemplo.com/audio.mp3"
        authorName="Dr. Felipe"
      />
    );

    const waveform = screen.getByTestId('whatsapp-waveform');
    expect(waveform).toBeInTheDocument();

    const firstBar = screen.getByTestId('wave-bar-0');
    expect(firstBar).toBeInTheDocument();

    // Clica na barra para seek
    fireEvent.click(firstBar);
  });
});
