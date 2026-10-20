import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ProductDomainModal from './ProductDomainModal';
import * as productApi from './productApi';

vi.mock('./productApi', () => ({
  fetchProductDomainApi: vi.fn(),
  updateProductDomainApi: vi.fn(),
  verifyProductDomainApi: vi.fn(),
}));

describe('ProductDomainModal - Domínios Personalizados (CNAME Whitelabel)', () => {
  const mockProduct = {
    id: 10,
    name: 'Mentoria High Ticket',
    slug: 'mentoria-high-ticket',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ProductDomainModal
        product={mockProduct}
        isOpen={false}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('carrega informações do domínio do produto e exibe status e CNAME alvo', async () => {
    productApi.fetchProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: 'pay.expert.com.br',
      status: 'active',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: true,
      message: 'Domínio apontando corretamente.',
    });

    render(
      <ProductDomainModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    expect(screen.getByText(/Domínio Próprio/i)).toBeInTheDocument();

    await waitFor(() => {
      const input = screen.getByTestId('input-custom-domain');
      expect(input.value).toBe('pay.expert.com.br');
    });

    expect(screen.getByText('CNAME Ativo e Conectado')).toBeInTheDocument();
    expect(screen.getByText('checkout.seudominiobase.com')).toBeInTheDocument();
  });

  it('permite salvar/atualizar novo domínio personalizado com sucesso', async () => {
    productApi.fetchProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: null,
      status: 'unconfigured',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: false,
    });

    productApi.updateProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: 'checkout.meudominio.com',
      status: 'pending',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: false,
    });

    const mockFeedback = vi.fn();
    const mockClose = vi.fn();

    render(
      <ProductDomainModal
        product={mockProduct}
        isOpen={true}
        onClose={mockClose}
        showFeedback={mockFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-custom-domain')).toBeInTheDocument();
    });

    const input = screen.getByTestId('input-custom-domain');
    fireEvent.change(input, { target: { value: 'checkout.meudominio.com' } });

    const saveButton = screen.getByTestId('btn-save-domain');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(productApi.updateProductDomainApi).toHaveBeenCalledWith(10, 'checkout.meudominio.com');
      expect(mockFeedback).toHaveBeenCalledWith('success', expect.stringContaining('configurado com sucesso'));
    });
  });

  it('permite verificar apontamento de DNS (CNAME)', async () => {
    productApi.fetchProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: 'pay.expert.com.br',
      status: 'pending',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: false,
      message: 'DNS não propagado ainda',
    });

    productApi.verifyProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: 'pay.expert.com.br',
      status: 'active',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: true,
      message: 'Apontamento CNAME validado com sucesso!',
    });

    const mockFeedback = vi.fn();

    render(
      <ProductDomainModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={mockFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-verify-domain')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-verify-domain'));

    await waitFor(() => {
      expect(productApi.verifyProductDomainApi).toHaveBeenCalledWith(10);
      expect(mockFeedback).toHaveBeenCalledWith('success', expect.stringContaining('validado com sucesso'));
    });
  });

  it('permite copiar o host de destino CNAME', async () => {
    productApi.fetchProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: 'pay.expert.com.br',
      status: 'active',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: true,
    });

    render(
      <ProductDomainModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-copy-cname-target')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-copy-cname-target'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('checkout.seudominiobase.com');
  });

  it('abre popup de confirmação ao clicar em desvincular e remove o domínio com sucesso', async () => {
    productApi.fetchProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: 'pay.expert.com.br',
      status: 'active',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: true,
    });

    productApi.updateProductDomainApi.mockResolvedValueOnce({
      product_id: 10,
      custom_domain: null,
      status: 'unconfigured',
      cname_target: 'checkout.seudominiobase.com',
      is_pointing: false,
    });

    const mockFeedback = vi.fn();

    render(
      <ProductDomainModal
        product={mockProduct}
        isOpen={true}
        onClose={vi.fn()}
        showFeedback={mockFeedback}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-request-remove-domain')).toBeInTheDocument();
    });

    // Clica no botão de desvincular para abrir popup
    fireEvent.click(screen.getByTestId('btn-request-remove-domain'));

    // Popup de confirmação deve aparecer centralizado com backdrop
    expect(screen.getByTestId('delete-domain-modal-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Desvincular Domínio Próprio\?/i)).toBeInTheDocument();

    // Clica no botão de confirmar desvinculação
    fireEvent.click(screen.getByTestId('btn-confirm-remove-domain'));

    await waitFor(() => {
      expect(productApi.updateProductDomainApi).toHaveBeenCalledWith(10, null);
      expect(mockFeedback).toHaveBeenCalledWith('success', expect.stringContaining('desvinculado'));
    });
  });
});
