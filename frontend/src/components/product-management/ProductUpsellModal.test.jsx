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
}));

describe('ProductUpsellModal - Configuração de UpSell do Produto', () => {
  const mockProduct = {
    id: 15,
    name: 'Mentoria Exclusiva',
    slug: 'mentoria-exclusiva',
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('carrega dados existentes do UpSell incluindo external_url', async () => {
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
  });

  it('permite cadastrar e salvar external_url na criação de UpSell', async () => {
    productApi.fetchProductUpsellsApi.mockResolvedValueOnce([]);
    productApi.createProductUpsellApi.mockResolvedValueOnce({
      id: 202,
      title: 'Oferta Especial',
      external_url: 'https://oferta.seusite.com/pagina-upsell',
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
      expect(screen.getByTestId('input-upsell-external-url')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-upsell-external-url'), {
      target: { value: 'https://oferta.seusite.com/pagina-upsell' },
    });

    fireEvent.click(screen.getByTestId('btn-save-upsell'));

    await waitFor(() => {
      expect(productApi.createProductUpsellApi).toHaveBeenCalledWith(
        15,
        expect.objectContaining({
          external_url: 'https://oferta.seusite.com/pagina-upsell',
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

    // Clica para excluir
    fireEvent.click(screen.getByTestId('btn-delete-upsell'));

    // Popup centralizado de confirmação deve aparecer
    expect(screen.getByTestId('upsell-delete-confirm-overlay')).toBeInTheDocument();
    expect(screen.getByText('Excluir Oferta de UpSell?')).toBeInTheDocument();

    // Clica em cancelar dentro do popup
    fireEvent.click(screen.getByTestId('btn-cancel-delete-upsell'));

    // Popup deve fechar sem chamar deleteApi
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
