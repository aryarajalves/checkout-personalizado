import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ProductOrderBumpsModal } from './ProductOrderBumpsModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductOrderBumpsApi: vi.fn(),
  createProductOrderBumpApi: vi.fn(),
  updateProductOrderBumpApi: vi.fn(),
  deleteProductOrderBumpApi: vi.fn(),
  fetchProductsApi: vi.fn(),
  fetchProductOffersApi: vi.fn(),
}));

describe('ProductOrderBumpsModal - Order Bump Vinculado ao Catálogo', () => {
  const mockProduct = { id: 1, name: 'Produto Principal', slug: 'produto-principal' };
  const mockBumps = [
    {
      id: 10,
      title: 'Ebook Complementar',
      description: 'Guia prático',
      price_brl: 29.9,
      is_active: true,
      bump_product_id: 2,
      bump_offer_id: 101,
      bump_product_name: 'Ebook SEO',
      bump_offer_name: 'Oferta Especial',
    },
  ];
  const mockCatalog = [
    { id: 1, name: 'Produto Principal', price_brl: 100.0 }, // Não deve aparecer
    { id: 2, name: 'Ebook SEO', price_brl: 47.0 },
    { id: 3, name: 'Planilha Financeira', price_brl: 67.0 },
  ];
  const mockOffersForProduct2 = [
    { id: 101, name: 'Oferta Especial', price_brl: 29.9, is_default: false },
    { id: 102, name: 'Preço Cheio', price_brl: 47.0, is_default: true },
  ];

  const showFeedback = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    productApi.fetchProductOrderBumpsApi.mockResolvedValue(mockBumps);
    productApi.fetchProductsApi.mockResolvedValue(mockCatalog);
    productApi.fetchProductOffersApi.mockResolvedValue(mockOffersForProduct2);
    productApi.createProductOrderBumpApi.mockResolvedValue({ id: 11 });
    productApi.updateProductOrderBumpApi.mockResolvedValue({ id: 10 });
    productApi.deleteProductOrderBumpApi.mockResolvedValue({ message: 'Removido' });
  });

  it('renderiza os order bumps existentes e exibe badge com o nome do produto vinculado', async () => {
    render(
      <ProductOrderBumpsModal
        product={mockProduct}
        isOpen={true}
        onClose={onClose}
        showFeedback={showFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ebook Complementar')).toBeInTheDocument();
    });

    expect(screen.getByText(/Produto: Ebook SEO/)).toBeInTheDocument();
    expect(screen.getByText(/29,90/)).toBeInTheDocument();
  });

  it('carrega catálogo e permite vincular produto real com dropdown de preços e títulos customizáveis', async () => {
    render(
      <ProductOrderBumpsModal
        product={mockProduct}
        isOpen={true}
        onClose={onClose}
        showFeedback={showFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-add-order-bump')).toBeInTheDocument();
    });

    // 1. Clica para adicionar novo bump
    fireEvent.click(screen.getByTestId('btn-add-order-bump'));

    const productSelect = screen.getByTestId('select-bump-product');
    expect(productSelect).toBeInTheDocument();
    // Confirma que o produto atual (ID: 1) foi filtrado e não aparece como opção
    expect(screen.queryByRole('option', { name: /Produto Principal/ })).not.toBeInTheDocument();

    // 2. Seleciona o produto 'Ebook SEO' (ID 2)
    fireEvent.change(productSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(productApi.fetchProductOffersApi).toHaveBeenCalledWith(2);
    });

    // 3. Verifica que por padrão o título foi preenchido com o nome do produto
    const titleInput = screen.getByTestId('input-bump-title');
    expect(titleInput).toHaveValue('Ebook SEO');

    // 4. Verifica que as ofertas foram carregadas e há um seletor de ofertas
    await waitFor(() => {
      expect(screen.getByTestId('select-bump-offer')).toBeInTheDocument();
    });

    // 5. Altera a oferta selecionada para Oferta Especial (R$ 29.90)
    fireEvent.change(screen.getByTestId('select-bump-offer'), { target: { value: '101' } });
    expect(screen.getByTestId('input-bump-price')).toHaveValue(29.9);

    // 6. Customiza o título do bump (troca para um copy persuasivo)
    fireEvent.change(titleInput, { target: { value: 'Leve também o Ebook SEO com 40% OFF!' } });
    expect(titleInput).toHaveValue('Leve também o Ebook SEO com 40% OFF!');

    // 7. Salva o bump
    fireEvent.click(screen.getByTestId('btn-save-order-bump'));

    await waitFor(() => {
      expect(productApi.createProductOrderBumpApi).toHaveBeenCalledWith(1, {
        title: 'Leve também o Ebook SEO com 40% OFF!',
        description: null,
        price_brl: 29.9,
        is_active: true,
        bump_product_id: 2,
        bump_offer_id: 101,
      });
    });

    expect(showFeedback).toHaveBeenCalledWith('success', 'Novo order bump adicionado com sucesso!');
  });

  it('permite abrir modal de confirmação de exclusão e deletar um order bump', async () => {
    render(
      <ProductOrderBumpsModal
        product={mockProduct}
        isOpen={true}
        onClose={onClose}
        showFeedback={showFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-bump-10')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-bump-10'));

    expect(screen.getByTestId('delete-bump-confirm-content')).toBeInTheDocument();
    expect(screen.getByText(/Deseja realmente remover o bump/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-delete-bump-btn'));

    await waitFor(() => {
      expect(productApi.deleteProductOrderBumpApi).toHaveBeenCalledWith(1, 10);
    });

    expect(showFeedback).toHaveBeenCalledWith('success', 'Order bump removido com sucesso!');
  });
});
