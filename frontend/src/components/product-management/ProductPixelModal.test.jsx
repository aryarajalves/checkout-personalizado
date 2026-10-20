import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ProductPixelModal } from './ProductPixelModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductPixelConfigApi: vi.fn(),
  updateProductPixelConfigApi: vi.fn(),
}));

describe('ProductPixelModal - Configuração de Multi-Pixels do Produto', () => {
  const mockProduct = {
    id: 42,
    name: 'Formação Fullstack Pro',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ProductPixelModal
        product={mockProduct}
        isOpen={false}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('carrega dados existentes de pixel e preenche formulário com Meta, Google Ads e TikTok', async () => {
    productApi.fetchProductPixelConfigApi.mockResolvedValueOnce({
      meta_pixel_id: '9988776655',
      google_ads_id: 'AW-11223344',
      google_ads_conversion_label: 'convLabelXYZ',
      tiktok_pixel_id: 'TT-987654321',
      pixel_purchase_active: true,
      pixel_initiate_active: false,
      pixel_pageview_active: true,
    });

    render(
      <ProductPixelModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    expect(screen.getByText(/Multi-Pixels de Rastreamento/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('input-meta-pixel-id')).toHaveValue('9988776655');
      expect(screen.getByTestId('input-google-ads-id')).toHaveValue('AW-11223344');
      expect(screen.getByTestId('input-google-ads-label')).toHaveValue('convLabelXYZ');
      expect(screen.getByTestId('input-tiktok-pixel-id')).toHaveValue('TT-987654321');
    });

    expect(screen.getByTestId('toggle-pixel-purchase')).toBeChecked();
    expect(screen.getByTestId('toggle-pixel-initiate')).not.toBeChecked();
  });

  it('salva configurações de multi-pixels com sucesso ao submeter', async () => {
    productApi.fetchProductPixelConfigApi.mockResolvedValueOnce({
      meta_pixel_id: '',
      google_ads_id: '',
      google_ads_conversion_label: '',
      tiktok_pixel_id: '',
      pixel_purchase_active: true,
      pixel_initiate_active: true,
      pixel_pageview_active: true,
    });
    productApi.updateProductPixelConfigApi.mockResolvedValueOnce({
      meta_pixel_id: '1234567890',
      google_ads_id: 'AW-999999',
      google_ads_conversion_label: 'lbl123',
      tiktok_pixel_id: 'TT-111111',
      pixel_purchase_active: true,
      pixel_initiate_active: true,
      pixel_pageview_active: true,
    });

    const handleClose = vi.fn();
    const handleFeedback = vi.fn();

    render(
      <ProductPixelModal
        product={mockProduct}
        isOpen={true}
        onClose={handleClose}
        showFeedback={handleFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-meta-pixel-id')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-meta-pixel-id'), {
      target: { value: '1234567890' },
    });
    fireEvent.change(screen.getByTestId('input-google-ads-id'), {
      target: { value: 'AW-999999' },
    });
    fireEvent.change(screen.getByTestId('input-google-ads-label'), {
      target: { value: 'lbl123' },
    });
    fireEvent.change(screen.getByTestId('input-tiktok-pixel-id'), {
      target: { value: 'TT-111111' },
    });

    fireEvent.click(screen.getByTestId('save-pixel-modal-btn'));

    await waitFor(() => {
      expect(productApi.updateProductPixelConfigApi).toHaveBeenCalledWith(42, {
        meta_pixel_id: '1234567890',
        google_ads_id: 'AW-999999',
        google_ads_conversion_label: 'lbl123',
        tiktok_pixel_id: 'TT-111111',
        pixel_purchase_active: true,
        pixel_initiate_active: true,
        pixel_pageview_active: true,
      });
      expect(handleFeedback).toHaveBeenCalledWith('success', expect.stringContaining('sucesso'));
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
