import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ProductABTestModal from './ProductABTestModal';
import * as abTestApi from './abTestApi';

vi.mock('./abTestApi', () => ({
  fetchProductABTestApi: vi.fn(),
  createProductABTestApi: vi.fn(),
  updateABTestApi: vi.fn(),
  deleteABTestApi: vi.fn(),
  trackABTestEventApi: vi.fn(),
}));

describe('ProductABTestModal - Teste A/B de Checkout e Ofertas', () => {
  const mockProductWithOffers = {
    id: 15,
    name: 'Curso Mestres do Código',
    slug: 'curso-mestres',
    offers: [
      { id: 101, name: 'Oferta Padrão (Sem Bônus)', slug: 'curso-mestres-padrao', price_brl: 497.0 },
      { id: 102, name: 'Oferta Promocional (Com Bônus)', slug: 'curso-mestres-promo', price_brl: 297.0 },
    ],
  };

  const mockProductSingleOffer = {
    id: 16,
    name: 'E-book Exclusivo',
    slug: 'ebook-exclusivo',
    offers: [
      { id: 201, name: 'Oferta Única', slug: 'ebook-unica', price_brl: 47.0 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ProductABTestModal
        product={mockProductWithOffers}
        isOpen={false}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza aviso de necessidade de pelo menos 2 ofertas quando há apenas 1', async () => {
    abTestApi.fetchProductABTestApi.mockResolvedValueOnce(null);

    render(
      <ProductABTestModal
        product={mockProductSingleOffer}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Pelo menos 2 ofertas são necessárias/i)).toBeInTheDocument();
    });
  });

  it('renderiza formulário de criação e permite iniciar experimento A/B 50/50', async () => {
    abTestApi.fetchProductABTestApi.mockResolvedValueOnce(null);
    abTestApi.createProductABTestApi.mockResolvedValueOnce({
      id: 1,
      product_id: 15,
      name: 'Teste Mestres 50/50',
      is_active: true,
      split_ratio: 50,
      offer_a_id: 101,
      offer_a_name: 'Oferta Padrão (Sem Bônus)',
      offer_a_price_brl: 497.0,
      offer_b_id: 102,
      offer_b_name: 'Oferta Promocional (Com Bônus)',
      offer_b_price_brl: 297.0,
      visitors_a: 0,
      visitors_b: 0,
      initiates_a: 0,
      initiates_b: 0,
      conversions_a: 0,
      conversions_b: 0,
      revenue_a_brl: 0.0,
      revenue_b_brl: 0.0,
      conversion_rate_a: 0.0,
      conversion_rate_b: 0.0,
      winning_variant: null,
    });

    const mockFeedback = vi.fn();
    render(
      <ProductABTestModal
        product={mockProductWithOffers}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={mockFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-create-abtest')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-abtest-name'), {
      target: { value: 'Teste Mestres 50/50' },
    });

    fireEvent.click(screen.getByTestId('btn-create-abtest'));

    await waitFor(() => {
      expect(abTestApi.createProductABTestApi).toHaveBeenCalledWith(15, {
        name: 'Teste Mestres 50/50',
        offer_a_id: 101,
        offer_b_id: 102,
        split_ratio: 50,
      });
      expect(mockFeedback).toHaveBeenCalledWith('success', expect.stringContaining('iniciado com sucesso'));
    });
  });

  it('exibe métricas completas do funil e badge de variante vencedora', async () => {
    abTestApi.fetchProductABTestApi.mockResolvedValueOnce({
      id: 5,
      product_id: 15,
      name: 'Experimento Preço vs Bônus',
      is_active: true,
      split_ratio: 50,
      offer_a_id: 101,
      offer_a_name: 'Oferta Padrão',
      offer_a_price_brl: 497.0,
      offer_b_id: 102,
      offer_b_name: 'Oferta Promocional',
      offer_b_price_brl: 297.0,
      visitors_a: 100,
      visitors_b: 100,
      initiates_a: 20,
      initiates_b: 30,
      conversions_a: 5,
      conversions_b: 15,
      revenue_a_brl: 2485.0,
      revenue_b_brl: 4455.0,
      conversion_rate_a: 5.0,
      conversion_rate_b: 15.0,
      winning_variant: 'B',
    });

    render(
      <ProductABTestModal
        product={mockProductWithOffers}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Experimento Preço vs Bônus')).toBeInTheDocument();
      expect(screen.getByTestId('abtest-status-badge')).toHaveTextContent(/Ativo em Produção/i);
      expect(screen.getByTestId('metric-visitors-a')).toHaveTextContent('100');
      expect(screen.getByTestId('metric-visitors-b')).toHaveTextContent('100');
      expect(screen.getByTestId('metric-conversions-a')).toHaveTextContent('5');
      expect(screen.getByTestId('metric-conversions-b')).toHaveTextContent('15');
      expect(screen.getByTestId('metric-rate-a')).toHaveTextContent('5.0%');
      expect(screen.getByTestId('metric-rate-b')).toHaveTextContent('15.0%');
      expect(screen.getByText('Vencedora')).toBeInTheDocument();
    });
  });

  it('permite alternar status ativo/pausado do teste', async () => {
    abTestApi.fetchProductABTestApi.mockResolvedValueOnce({
      id: 5,
      product_id: 15,
      name: 'Experimento Ativo',
      is_active: true,
      split_ratio: 50,
      offer_a_id: 101,
      offer_a_name: 'Oferta A',
      offer_a_price_brl: 100.0,
      offer_b_id: 102,
      offer_b_name: 'Oferta B',
      offer_b_price_brl: 120.0,
      visitors_a: 10,
      visitors_b: 10,
      initiates_a: 2,
      initiates_b: 2,
      conversions_a: 1,
      conversions_b: 1,
      revenue_a_brl: 100.0,
      revenue_b_brl: 120.0,
      conversion_rate_a: 10.0,
      conversion_rate_b: 10.0,
      winning_variant: null,
    });

    abTestApi.updateABTestApi.mockResolvedValueOnce({
      id: 5,
      product_id: 15,
      name: 'Experimento Ativo',
      is_active: false,
      split_ratio: 50,
      offer_a_id: 101,
      offer_a_name: 'Oferta A',
      offer_a_price_brl: 100.0,
      offer_b_id: 102,
      offer_b_name: 'Oferta B',
      offer_b_price_brl: 120.0,
      visitors_a: 10,
      visitors_b: 10,
      initiates_a: 2,
      initiates_b: 2,
      conversions_a: 1,
      conversions_b: 1,
      revenue_a_brl: 100.0,
      revenue_b_brl: 120.0,
      conversion_rate_a: 10.0,
      conversion_rate_b: 10.0,
      winning_variant: null,
    });

    const mockFeedback = vi.fn();
    render(
      <ProductABTestModal
        product={mockProductWithOffers}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={mockFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-toggle-abtest-status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-toggle-abtest-status'));

    await waitFor(() => {
      expect(abTestApi.updateABTestApi).toHaveBeenCalledWith(5, { is_active: false });
      expect(mockFeedback).toHaveBeenCalledWith('success', expect.stringContaining('pausado com sucesso'));
    });
  });

  it('permite abrir confirmação de exclusão e excluir teste', async () => {
    abTestApi.fetchProductABTestApi.mockResolvedValueOnce({
      id: 5,
      product_id: 15,
      name: 'Experimento para Excluir',
      is_active: true,
      split_ratio: 50,
      offer_a_id: 101,
      offer_a_name: 'Oferta A',
      offer_a_price_brl: 100.0,
      offer_b_id: 102,
      offer_b_name: 'Oferta B',
      offer_b_price_brl: 120.0,
      visitors_a: 0,
      visitors_b: 0,
      initiates_a: 0,
      initiates_b: 0,
      conversions_a: 0,
      conversions_b: 0,
      revenue_a_brl: 0.0,
      revenue_b_brl: 0.0,
      conversion_rate_a: 0.0,
      conversion_rate_b: 0.0,
      winning_variant: null,
    });

    abTestApi.deleteABTestApi.mockResolvedValueOnce({ success: true });

    const mockFeedback = vi.fn();
    render(
      <ProductABTestModal
        product={mockProductWithOffers}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={mockFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-abtest-prompt')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-abtest-prompt'));

    expect(screen.getByTestId('btn-confirm-delete-abtest')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-confirm-delete-abtest'));

    await waitFor(() => {
      expect(abTestApi.deleteABTestApi).toHaveBeenCalledWith(5);
      expect(mockFeedback).toHaveBeenCalledWith('success', expect.stringContaining('excluído com sucesso'));
    });
  });
});
