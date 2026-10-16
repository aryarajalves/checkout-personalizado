import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ProductManagement from '../ProductManagement';
import { ToastProvider } from '../../context/ToastContext';

// Mock dos serviços de API
vi.mock('./productApi', () => ({
  fetchProductsApi: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: 'Curso de Cripto Pro',
        slug: 'curso-cripto-pro',
        description: 'Aprenda DeFi e Web3',
        price_brl: 97.0,
        price_usd: 20.0,
        is_active: true,
        payment_methods: 'all',
        offers: [
          {
            id: 10,
            product_id: 1,
            name: 'Oferta Principal',
            slug: 'curso-cripto-pro',
            price_brl: 97.0,
            price_usd: 20.0,
            is_default: true,
            is_active: true,
          },
        ],
        split_rules: [
          {
            id: 1,
            product_id: 1,
            recipient_id: 1,
            percentage: 30.0,
            recipient_name: 'Sócio Parceiro',
          },
        ],
      },
    ])
  ),
  createProductApi: vi.fn((data) => Promise.resolve({ ...data, id: 2 })),
  updateProductApi: vi.fn((id, data) => Promise.resolve({ ...data, id })),
  deleteProductApi: vi.fn(() => Promise.resolve({ message: 'Excluído com sucesso' })),
  updateProductSplitRulesApi: vi.fn((id, rules) => Promise.resolve(rules)),
  fetchSplitRecipientsApi: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: 'Sócio Parceiro',
        email: 'socio@teste.com',
        default_percentage: 25.0,
      },
      {
        id: 2,
        name: 'Coprodutor',
        email: 'coprodutor@teste.com',
        default_percentage: 20.0,
      },
    ])
  ),
  fetchProductOffersApi: vi.fn(() =>
    Promise.resolve([
      {
        id: 10,
        product_id: 1,
        name: 'Oferta Principal',
        slug: 'curso-cripto-pro',
        price_brl: 97.0,
        price_usd: 20.0,
        is_default: true,
        is_active: true,
      },
    ])
  ),
  createProductOfferApi: vi.fn((prodId, data) => Promise.resolve({ ...data, id: 11, product_id: prodId })),
  updateProductOfferApi: vi.fn((prodId, offerId, data) => Promise.resolve({ ...data, id: offerId, product_id: prodId })),
  deleteProductOfferApi: vi.fn(() => Promise.resolve({ message: 'Oferta excluída com sucesso' })),
}));

describe('ProductManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <ProductManagement currentUser={{ role: 'superadmin' }} />
      </ToastProvider>
    );
  };

  it('renders header, search bar, and products table with loaded items', async () => {
    renderComponent();

    expect(screen.getByText('Produtos & Ofertas')).toBeInTheDocument();
    expect(screen.getByTestId('create-product-btn')).toBeInTheDocument();
    expect(screen.getByTestId('search-products-input')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Curso de Cripto Pro')).toBeInTheDocument();
      expect(screen.getByText('/pay/curso-cripto-pro')).toBeInTheDocument();
      expect(screen.getByText(/30.0%/)).toBeInTheDocument();
    });
  });

  it('opens ProductModal when clicking "Novo Produto" and allows filling the form', async () => {
    renderComponent();

    const createBtn = screen.getByTestId('create-product-btn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      const modal = screen.getByTestId('product-modal');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByText('Novo Produto')).toBeInTheDocument();
    });

    const nameInput = screen.getByTestId('input-product-name');
    fireEvent.change(nameInput, { target: { value: 'Mentoria Exclusiva' } });

    // Verifica auto-slug gerado
    const slugInput = screen.getByTestId('input-product-slug');
    expect(slugInput.value).toBe('mentoria-exclusiva');

    const priceInput = screen.getByTestId('input-product-price-brl');
    fireEvent.change(priceInput, { target: { value: '497.00' } });

    // Testa checkbox de exigir CPF
    const cpfToggle = screen.getByTestId('toggle-product-require-cpf');
    expect(cpfToggle).toBeInTheDocument();
    expect(cpfToggle.checked).toBe(false);
    fireEvent.click(cpfToggle);
    expect(cpfToggle.checked).toBe(true);

    // Testa campo de ID do Pixel do Meta
    const pixelInput = screen.getByTestId('input-product-meta-pixel-id');
    expect(pixelInput).toBeInTheDocument();
    fireEvent.change(pixelInput, { target: { value: '987654321012345' } });
    expect(pixelInput.value).toBe('987654321012345');

    const cancelBtn = screen.getByTestId('cancel-product-btn');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('product-modal')).not.toBeInTheDocument();
    });
  });

  it('opens ProductOffersModal and allows viewing and creating multiple offers for a product', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('btn-offers-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-offers-1'));

    await waitFor(() => {
      expect(screen.getByTestId('product-offers-modal')).toBeInTheDocument();
      expect(screen.getByText('Ofertas & Preços: Curso de Cripto Pro')).toBeInTheDocument();
      expect(screen.getByText('Oferta Principal')).toBeInTheDocument();
    });

    // Abrir formulário para adicionar segunda oferta
    const openAddBtn = screen.getByTestId('open-add-offer-btn');
    fireEvent.click(openAddBtn);

    await waitFor(() => {
      expect(screen.getByTestId('input-new-offer-name')).toBeInTheDocument();
    });

    const nameInput = screen.getByTestId('input-new-offer-name');
    fireEvent.change(nameInput, { target: { value: 'Black Friday 50%' } });

    const priceInput = screen.getByTestId('input-new-offer-price-brl');
    fireEvent.change(priceInput, { target: { value: '47.00' } });

    const submitBtn = screen.getByTestId('submit-new-offer-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('input-new-offer-name')).not.toBeInTheDocument();
    });

    const closeBtn = screen.getByTestId('footer-close-offers-btn');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('product-offers-modal')).not.toBeInTheDocument();
    });
  });

  it('opens ProductSplitModal when clicking "Split" and shows progress and participants', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('btn-funnel-menu-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-funnel-menu-1'));
    fireEvent.click(screen.getByTestId('btn-split-1'));

    await waitFor(() => {
      expect(screen.getByTestId('product-split-modal')).toBeInTheDocument();
      expect(screen.getByText(/Divisão de Split: Curso de Cripto Pro/)).toBeInTheDocument();
      expect(screen.getByText(/30.0% Sócios/)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByTestId('cancel-split-modal-btn');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('product-split-modal')).not.toBeInTheDocument();
    });
  });

  it('prevents adding the same partner twice to product split rules', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('btn-funnel-menu-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-funnel-menu-1'));
    fireEvent.click(screen.getByTestId('btn-split-1'));

    await waitFor(() => {
      expect(screen.getByTestId('product-split-modal')).toBeInTheDocument();
    });

    // Já existe o Sócio 1 (ID 1). Clicamos em adicionar para incluir o Sócio 2 (ID 2)
    const addBtn = screen.getByTestId('add-split-rule-btn');
    expect(addBtn).not.toBeDisabled();
    fireEvent.click(addBtn);

    // Agora ambos os sócios (ID 1 e ID 2) estão presentes. O botão deve ficar desabilitado
    await waitFor(() => {
      expect(screen.getByTestId('split-rule-row-1')).toBeInTheDocument();
      expect(addBtn).toBeDisabled();
    });

    // Opção do sócio 1 no select da linha 1 deve estar desabilitada para evitar repetição
    const select1 = screen.getByTestId('select-recipient-1');
    const option1 = select1.querySelector('option[value="1"]');
    expect(option1).toBeDisabled();
  });

  it('opens ConfirmDeleteProductModal and cancels cleanly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-delete-1'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-product-modal')).toBeInTheDocument();
      expect(screen.getByText('Excluir Produto')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByTestId('cancel-delete-product-btn');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-delete-product-modal')).not.toBeInTheDocument();
    });
  });
});
