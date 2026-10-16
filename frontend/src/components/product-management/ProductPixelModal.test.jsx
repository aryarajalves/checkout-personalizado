import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ProductPixelModal } from './ProductPixelModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductPixelConfigApi: vi.fn(),
  updateProductPixelConfigApi: vi.fn(),
}));

describe('ProductPixelModal - Configuração de Meta Pixel do Produto', () => {
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

  it('carrega dados existentes de pixel e preenche formulário', async () => {
    productApi.fetchProductPixelConfigApi.mockResolvedValueOnce({
      meta_pixel_id: '9988776655',
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

    expect(screen.getByText(/Pixel de Rastreamento/i)).toBeInTheDocument();

    await waitFor(() => {
      const input = screen.getByTestId('input-meta-pixel-id');
      expect(input.value).toBe('9988776655');
    });

    expect(screen.getByTestId('toggle-pixel-purchase')).toBeChecked();
    expect(screen.getByTestId('toggle-pixel-initiate')).not.toBeChecked();
  });

  it('salva configurações de pixel com sucesso ao submeter', async () => {
    productApi.fetchProductPixelConfigApi.mockResolvedValueOnce({
      meta_pixel_id: '',
      pixel_purchase_active: true,
      pixel_initiate_active: true,
      pixel_pageview_active: true,
    });
    productApi.updateProductPixelConfigApi.mockResolvedValueOnce({
      meta_pixel_id: '1234567890',
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

    fireEvent.click(screen.getByTestId('save-pixel-modal-btn'));

    await waitFor(() => {
      expect(productApi.updateProductPixelConfigApi).toHaveBeenCalledWith(42, {
        meta_pixel_id: '1234567890',
        pixel_purchase_active: true,
        pixel_initiate_active: true,
        pixel_pageview_active: true,
      });
      expect(handleFeedback).toHaveBeenCalledWith('success', expect.stringContaining('sucesso'));
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
