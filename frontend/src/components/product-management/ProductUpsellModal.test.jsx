import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ProductUpsellModal } from './ProductUpsellModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductUpsellsApi: vi.fn(),
  createProductUpsellApi: vi.fn(),
  updateProductUpsellApi: vi.fn(),
  deleteProductUpsellApi: vi.fn(),
  fetchProductsApi: vi.fn(),
  fetchProductOffersApi: vi.fn(),
}));

describe('ProductUpsellModal - Configuração de UpSell e Downsell do Produto', () => {
  const mockProduct = {
    id: 15,
    name: 'Mentoria Exclusiva',
    slug: 'mentoria-exclusiva',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    productApi.fetchProductsApi.mockResolvedValue([
      { id: 20, name: 'Livro Físico', price_brl: 49.9 },
      { id: 30, name: 'Mini Curso', price_brl: 29.0 },
    ]);
    productApi.fetchProductOffersApi.mockResolvedValue([
      { id: 201, name: 'Oferta Promocional', price_brl: 39.9 },
    ]);
  });

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ProductUpsellModal
        product={mockProduct}
        isOpen={false}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('carrega dados existentes do UpSell e Downsell', async () => {
    productApi.fetchProductUpsellsApi.mockResolvedValueOnce([
      {
        id: 101,
        title: 'Masterclass Avançada',
        subtitle: 'Domine estratégias avançadas',
        description: 'Acesso vitalício à gravação.',
        price_brl: 147.0,
        video_url: 'https://youtube.com/watch?v=123',
        external_url: 'https://minhapagina.com/upsell-masterclass',
        is_active: true,
        upsell_product_id: 20,
        enable_downsell: true,
        downsell_title: 'Versão Resumida',
        downsell_price_brl: 27.0,
      },
    ]);

    render(
      <ProductUpsellModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-upsell-title')).toHaveValue('Masterclass Avançada');
      expect(screen.getByTestId('input-upsell-external-url')).toHaveValue('https://minhapagina.com/upsell-masterclass');
      expect(screen.getByTestId('input-upsell-price')).toHaveValue(147);
    });

    // Clica na aba de Downsell
    fireEvent.click(screen.getByTestId('tab-downsell'));

    await waitFor(() => {
      expect(screen.getByTestId('toggle-enable-downsell')).toBeChecked();
      expect(screen.getByTestId('input-downsell-title')).toHaveValue('Versão Resumida');
      expect(screen.getByTestId('input-downsell-price')).toHaveValue(27);
    });
  });

  it('permite cadastrar UpSell e configurar Downsell com catálogo', async () => {
    productApi.fetchProductUpsellsApi.mockResolvedValueOnce([]);
    productApi.createProductUpsellApi.mockResolvedValueOnce({
      id: 202,
      title: 'Oferta Especial',
    });

    const handleClose = vi.fn();
    const handleFeedback = vi.fn();

    render(
      <ProductUpsellModal
        product={mockProduct}
        isOpen={true}
        onClose={handleClose}
        showFeedback={handleFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('select-upsell-catalog-product')).toBeInTheDocument();
    });

    // Seleciona produto do catálogo para UpSell
    fireEvent.change(screen.getByTestId('select-upsell-catalog-product'), {
      target: { value: '20' },
    });

    // Vai para aba de Downsell
    fireEvent.click(screen.getByTestId('tab-downsell'));

    // Ativa Downsell
    const toggleDownsell = screen.getByTestId('toggle-enable-downsell');
    fireEvent.click(toggleDownsell);

    await waitFor(() => {
      expect(screen.getByTestId('input-downsell-price')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-downsell-price'), {
      target: { value: '37.00' },
    });

    // Salva
    fireEvent.click(screen.getByTestId('btn-save-upsell'));

    await waitFor(() => {
      expect(productApi.createProductUpsellApi).toHaveBeenCalledWith(
        15,
        expect.objectContaining({
          upsell_product_id: 20,
          enable_downsell: true,
          downsell_price_brl: 37.0,
        })
      );
      expect(handleFeedback).toHaveBeenCalledWith('success', expect.stringContaining('criada'));
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('abre popup de confirmação centralizado ao clicar em excluir e permite cancelar', async () => {
    productApi.fetchProductUpsellsApi.mockResolvedValueOnce([
      {
        id: 101,
        title: 'Masterclass',
        price_brl: 97.0,
        is_active: true,
      },
    ]);

    render(
      <ProductUpsellModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-upsell')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-upsell'));

    expect(screen.getByTestId('upsell-delete-confirm-overlay')).toBeInTheDocument();
    expect(screen.getByText('Excluir Oferta de UpSell/Downsell?')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-cancel-delete-upsell'));

    expect(screen.queryByTestId('upsell-delete-confirm-overlay')).not.toBeInTheDocument();
    expect(productApi.deleteProductUpsellApi).not.toHaveBeenCalled();
  });

  it('exclui UpSell com sucesso ao confirmar no popup', async () => {
    productApi.fetchProductUpsellsApi.mockResolvedValue([
      {
        id: 101,
        title: 'Masterclass',
        price_brl: 97.0,
        is_active: true,
      },
    ]);
    productApi.deleteProductUpsellApi.mockResolvedValueOnce({ ok: true });

    const handleFeedback = vi.fn();

    render(
      <ProductUpsellModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={handleFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-upsell')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-upsell'));
    expect(screen.getByTestId('btn-confirm-delete-upsell')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-confirm-delete-upsell'));

    await waitFor(() => {
      expect(productApi.deleteProductUpsellApi).toHaveBeenCalledWith(15, 101);
      expect(handleFeedback).toHaveBeenCalledWith('success', 'UpSell removido com sucesso!');
    });
  });
});
