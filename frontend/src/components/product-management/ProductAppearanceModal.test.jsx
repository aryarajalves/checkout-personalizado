import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ProductAppearanceModal } from './ProductAppearanceModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductAppearanceApi: vi.fn(),
  updateProductAppearanceApi: vi.fn(),
}));

describe('ProductAppearanceModal - Identidade Visual e Elementos de Conversão', () => {
  const mockProduct = {
    id: 99,
    name: 'Formação Astrologia Moderna',
    slug: 'formacao-astrologia',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ProductAppearanceModal
        product={mockProduct}
        isOpen={false}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('carrega dados existentes de aparência, capa, cronômetro e depoimentos', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#7c3aed',
      logo_url: 'https://expert.com/logo.png',
      image_url: 'https://expert.com/capa.jpg',
      timer_enabled: true,
      timer_minutes: 20,
      timer_text: 'Vagas com bônus expiram em:',
      testimonials: JSON.stringify([
        { id: 1, name: 'Lucas Lima', role: 'Aluno', rating: 5, text: 'Muito bom!' },
      ]),
    });

    render(
      <ProductAppearanceModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    expect(screen.getByText(/Aparência e Alta Conversão/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('input-appearance-logo-url')).toHaveValue('https://expert.com/logo.png');
      expect(screen.getByTestId('input-appearance-cover-url')).toHaveValue('https://expert.com/capa.jpg');
      expect(screen.getByTestId('input-appearance-color-text')).toHaveValue('#7c3aed');
      expect(screen.getByTestId('logo-preview-box')).toBeInTheDocument();
      expect(screen.getByTestId('cover-preview-box')).toBeInTheDocument();
    });
  });

  it('permite alternar abas e configurar cronômetro de escassez', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      timer_enabled: false,
      timer_minutes: 15,
      timer_text: 'Esta oferta especial expira em:',
    });

    render(
      <ProductAppearanceModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-appearance-timer')).toBeInTheDocument();
    });

    // Clica na aba Cronômetro
    fireEvent.click(screen.getByTestId('tab-appearance-timer'));
    expect(screen.getByTestId('timer-config-section')).toBeInTheDocument();

    // Ativa o cronômetro
    const toggle = screen.getByTestId('toggle-timer-enabled');
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    // Seleciona preset de 10 minutos
    fireEvent.click(screen.getByTestId('btn-timer-preset-10'));
    expect(screen.getByTestId('input-timer-minutes')).toHaveValue(10);
    expect(screen.getByTestId('timer-live-preview')).toHaveTextContent('10:00');
  });

  it('permite alternar para aba de depoimentos e adicionar novo depoimento', async () => {
    productApi.fetchProductAppearanceApi.mockResolvedValueOnce({
      primary_color: '#0284c7',
      testimonials: '[]',
    });

    render(
      <ProductAppearanceModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('tab-appearance-testimonials')).toBeInTheDocument();
    });

    // Clica na aba Depoimentos
    fireEvent.click(screen.getByTestId('tab-appearance-testimonials'));
    expect(screen.getByTestId('testimonials-editor')).toBeInTheDocument();
    expect(screen.getByTestId('empty-testimonials-msg')).toBeInTheDocument();

    // Abre formulário de novo depoimento
    fireEvent.click(screen.getByTestId('btn-add-testimonial'));
    expect(screen.getByTestId('add-testimonial-form')).toBeInTheDocument();

    // Preenche dados
    fireEvent.change(screen.getByTestId('input-testimonial-name'), {
      target: { value: 'Carolina Mendes' },
    });
    fireEvent.change(screen.getByTestId('input-testimonial-role'), {
      target: { value: 'Turma VIP' },
    });
    fireEvent.change(screen.getByTestId('input-testimonial-text'), {
      target: { value: 'Transformou meu faturamento!' },
    });

    fireEvent.click(screen.getByTestId('btn-confirm-add-testimonial'));

    // Verifica que o card do depoimento foi adicionado
    expect(screen.getByText('Carolina Mendes')).toBeInTheDocument();
    expect(screen.getByText(/Transformou meu faturamento!/)).toBeInTheDocument();
  });

  it('salva configurações completas de aparência, capa, timer e depoimentos', async () => {
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
      primary_color: '#dc2626',
      logo_url: 'https://minhamarca.com/logo.png',
      image_url: 'https://minhamarca.com/capa.png',
      timer_enabled: true,
      timer_minutes: 10,
      timer_text: 'Vagas limitadas!',
      testimonials: null,
    });

    const handleClose = vi.fn();
    const handleFeedback = vi.fn();

    render(
      <ProductAppearanceModal
        product={mockProduct}
        isOpen={true}
        onClose={handleClose}
        showFeedback={handleFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-appearance-logo-url')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-appearance-logo-url'), {
      target: { value: 'https://minhamarca.com/logo.png' },
    });
    fireEvent.change(screen.getByTestId('input-appearance-cover-url'), {
      target: { value: 'https://minhamarca.com/capa.png' },
    });

    // Clica no preset Vermelho (#dc2626)
    fireEvent.click(screen.getByTestId('preset-color-dc2626'));

    // Clica para salvar
    fireEvent.click(screen.getByTestId('btn-save-appearance'));

    await waitFor(() => {
      expect(productApi.updateProductAppearanceApi).toHaveBeenCalledWith(99, {
        primary_color: '#dc2626',
        logo_url: 'https://minhamarca.com/logo.png',
        image_url: 'https://minhamarca.com/capa.png',
        timer_enabled: false,
        timer_minutes: 15,
        timer_text: 'Esta oferta especial expira em:',
        testimonials: null,
      });
      expect(handleFeedback).toHaveBeenCalledWith('success', 'Personalização e elementos de conversão salvos com sucesso!');
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
