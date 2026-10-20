import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutBuilderModal from './CheckoutBuilderModal';
import * as productApi from '../product-management/productApi';

vi.mock('../product-management/productApi', () => ({
  fetchProductAppearanceApi: vi.fn(),
  updateProductAppearanceApi: vi.fn(),
}));

describe('CheckoutBuilderModal - Editor Visual de Checkout com Preview Ao Vivo', () => {
  const mockProduct = {
    id: 101,
    name: 'Mentoria High-Ticket Elite',
    slug: 'mentoria-elite',
    price_brl: 4500.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza o builder quando isOpen é false', () => {
    const { container } = render(
      <CheckoutBuilderModal
        product={mockProduct}
        isOpen={false}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o editor visual com controles e preview ao vivo lado a lado', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      logo_url: 'https://exemplo.com/logo.png',
      image_url: 'https://exemplo.com/capa.jpg',
      timer_enabled: true,
      timer_minutes: 15,
      timer_text: 'Oferta exclusiva expira em:',
      testimonials: JSON.stringify([
        { id: 1, name: 'Roberto Carlos', rating: 5, text: 'Excelente treinamento!' },
      ]),
    });

    render(
      <CheckoutBuilderModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    expect(screen.getByText(/Editor Visual/i)).toBeInTheDocument();

    await waitFor(() => {
      // Verifica painel de controles e preview pane
      expect(screen.getByTestId('builder-controls-pane')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-live-preview-pane')).toBeInTheDocument();

      // Verifica elementos no preview
      expect(screen.getByTestId('live-preview-timer-bar')).toBeInTheDocument();
      expect(screen.getByTestId('live-timer-countdown')).toHaveTextContent('15:00');
      expect(screen.getByTestId('live-preview-action-btn')).toHaveTextContent(/Pagar Agora/);
      expect(screen.getByText('Roberto Carlos')).toBeInTheDocument();
    });
  });

  it('permite alternar entre visualização Desktop e Mobile', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      timer_enabled: false,
    });

    render(
      <CheckoutBuilderModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      // Inicia em modo desktop por padrão
      expect(screen.getByTestId('frame-desktop-view')).toBeInTheDocument();
      expect(screen.queryByTestId('frame-mobile-view')).not.toBeInTheDocument();
    });

    // Clica no botão Mobile
    fireEvent.click(screen.getByTestId('btn-preview-mode-mobile'));
    expect(screen.getByTestId('frame-mobile-view')).toBeInTheDocument();
    expect(screen.queryByTestId('frame-desktop-view')).not.toBeInTheDocument();

    // Volta para o modo Desktop
    fireEvent.click(screen.getByTestId('btn-preview-mode-desktop'));
    expect(screen.getByTestId('frame-desktop-view')).toBeInTheDocument();
  });

  it('atualiza em tempo real as cores do botão no preview ao selecionar preset', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      timer_enabled: false,
    });

    render(
      <CheckoutBuilderModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('preset-color-16a34a')).toBeInTheDocument();
    });

    // Clica no preset Verde Conversão (#16a34a)
    fireEvent.click(screen.getByTestId('preset-color-16a34a'));

    // Verifica que o input refletiu e o botão de ação do live preview recebeu a nova cor
    expect(screen.getByTestId('input-appearance-color-text')).toHaveValue('#16a34a');
    const liveActionBtn = screen.getByTestId('live-preview-action-btn');
    expect(liveActionBtn.style.backgroundColor).toBe('rgb(22, 163, 74)'); // #16a34a em rgb
  });

  it('salva as alterações e fecha o modal ao submeter', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      logo_url: '',
      image_url: '',
      timer_enabled: false,
      timer_minutes: 15,
      timer_text: 'Esta oferta especial expira em:',
      testimonials: null,
    });
    productApi.updateProductAppearanceApi.mockResolvedValueOnce({
      success: true,
    });

    const handleClose = vi.fn();
    const handleFeedback = vi.fn();

    render(
      <CheckoutBuilderModal
        product={mockProduct}
        isOpen={true}
        onClose={handleClose}
        showFeedback={handleFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-save-appearance')).toBeInTheDocument();
    });

    // Seleciona preset Roxo (#7c3aed)
    fireEvent.click(screen.getByTestId('preset-color-7c3aed'));

    // Salva
    fireEvent.click(screen.getByTestId('btn-save-appearance'));

    await waitFor(() => {
      expect(productApi.updateProductAppearanceApi).toHaveBeenCalledWith(101, {
        primary_color: '#7c3aed',
        logo_url: null,
        image_url: null,
        timer_enabled: false,
        timer_minutes: 15,
        timer_text: 'Esta oferta especial expira em:',
        testimonials: null,
        header_media_type: 'none',
        header_video_url: null,
        header_audio_url: null,
        header_audio_author_name: 'Mensagem do Especialista',
        header_audio_author_avatar: null,
      });
      expect(handleFeedback).toHaveBeenCalledWith('success', 'Personalização e elementos de conversão salvos com sucesso!');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('renderiza os depoimentos com avatar/foto e cargo no preview ao vivo do checkout', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      testimonials: JSON.stringify([
        {
          id: 99,
          name: 'Dona Maria',
          role: 'Cliente Verificada • RJ',
          rating: 5,
          text: 'Comprei e aprovei, resultado sensacional!',
          avatar_url: 'https://exemplo.com/dona-maria.jpg',
        },
      ]),
    });

    render(
      <CheckoutBuilderModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      // Verifica presença de Dona Maria no live preview
      expect(screen.getByText('Dona Maria')).toBeInTheDocument();
      expect(screen.getByText('Cliente Verificada • RJ')).toBeInTheDocument();
      expect(screen.getByText(/"Comprei e aprovei, resultado sensacional!"/)).toBeInTheDocument();
      // Verifica que a imagem do avatar de Dona Maria foi renderizada no preview
      const avatarImg = screen.getByAltText('Dona Maria');
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg).toHaveAttribute('src', 'https://exemplo.com/dona-maria.jpg');
      // Verifica o indicador no hero
      expect(screen.getByTestId('live-hero-rating-badge')).toHaveTextContent(/5.0/);
    });
  });

  it('exibe todas as 4 abas visíveis no painel e permite configurar mídia de topo com upload', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      timer_enabled: true,
      testimonials: JSON.stringify([{ id: 1, name: 'João' }]),
      header_media_type: 'video',
      header_video_url: 'https://youtube.com/watch?v=12345678901',
    });

    render(
      <CheckoutBuilderModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      // 1. Todas as 4 abas estão visíveis e renderizadas no painel
      expect(screen.getByTestId('tab-appearance-visual')).toHaveTextContent(/Visual & Capa/i);
      expect(screen.getByTestId('tab-appearance-timer')).toHaveTextContent(/Cronômetro/i);
      expect(screen.getByTestId('tab-appearance-testimonials')).toHaveTextContent(/Depoimentos/i);
      expect(screen.getByTestId('tab-appearance-media')).toHaveTextContent(/Vídeo \/ Áudio/i);
    });

    // Clica na 4ª aba (Vídeo / Áudio)
    fireEvent.click(screen.getByTestId('tab-appearance-media'));

    // Verifica que a seção de mídia foi exibida com os botões de tipo e upload
    expect(screen.getByTestId('builder-media-config-section')).toBeInTheDocument();
    expect(screen.getByTestId('media-choice-video')).toBeInTheDocument();
    expect(screen.getByTestId('media-choice-audio')).toBeInTheDocument();
    expect(screen.getByTestId('media-choice-both')).toBeInTheDocument();

    // Clica na opção "Vídeo + Áudio"
    fireEvent.click(screen.getByTestId('media-choice-both'));

    // Verifica que ambos os inputs (Vídeo e Áudio) estão presentes simultaneamente
    expect(screen.getByTestId('input-header-video-url')).toBeInTheDocument();
    expect(screen.getByTestId('input-header-audio-url')).toBeInTheDocument();
    expect(screen.getByTestId('input-header-video-url-btn-upload')).toHaveTextContent(/Upload Vídeo/i);
    expect(screen.getByTestId('input-header-audio-url-btn-upload')).toHaveTextContent(/Upload Áudio/i);
  });
});

