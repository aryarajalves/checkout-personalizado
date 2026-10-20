import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ProductModal from './ProductModal';

describe('ProductModal - Configuração de Produto e Descontos', () => {
  const defaultProps = {
    isOpen: true,
    product: null,
    loading: false,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renderiza os campos e sliders de Desconto Pix e Desconto Cripto', () => {
    render(<ProductModal {...defaultProps} />);

    expect(screen.getByTestId('input-product-pix-discount')).toBeInTheDocument();
    expect(screen.getByTestId('slider-product-pix-discount')).toBeInTheDocument();
    expect(screen.getByTestId('input-product-crypto-discount')).toBeInTheDocument();
    expect(screen.getByTestId('slider-product-crypto-discount')).toBeInTheDocument();
  });

  it('preenche valores existentes ao editar um produto com descontos', () => {
    const existingProduct = {
      name: 'Mentoria Black',
      slug: 'mentoria-black',
      price_brl: 1000.0,
      price_usd: 200.0,
      payment_methods: 'all',
      is_active: true,
      require_cpf: false,
      pix_discount_percent: 10.0,
      crypto_discount_percent: 15.0,
    };

    render(<ProductModal {...defaultProps} product={existingProduct} />);

    expect(screen.getByTestId('input-product-name')).toHaveValue('Mentoria Black');
    expect(screen.getByTestId('input-product-pix-discount')).toHaveValue(10);
    expect(screen.getByTestId('slider-product-pix-discount')).toHaveValue('10');
    expect(screen.getByTestId('input-product-crypto-discount')).toHaveValue(15);
    expect(screen.getByTestId('slider-product-crypto-discount')).toHaveValue('15');
  });

  it('atualiza o valor e sincroniza ao mover o range slider', () => {
    render(<ProductModal {...defaultProps} />);

    const pixSlider = screen.getByTestId('slider-product-pix-discount');
    const pixInput = screen.getByTestId('input-product-pix-discount');

    fireEvent.change(pixSlider, { target: { value: '25' } });
    expect(pixInput).toHaveValue(25);
    expect(pixSlider).toHaveValue('25');

    const cryptoSlider = screen.getByTestId('slider-product-crypto-discount');
    const cryptoInput = screen.getByTestId('input-product-crypto-discount');

    fireEvent.change(cryptoSlider, { target: { value: '40' } });
    expect(cryptoInput).toHaveValue(40);
    expect(cryptoSlider).toHaveValue('40');
  });

  it('limita automaticamente o desconto entre 0 e 100 (clamp)', () => {
    render(<ProductModal {...defaultProps} />);

    const pixInput = screen.getByTestId('input-product-pix-discount');
    // Tentativa de digitar valor acima de 100 é travada em 100
    fireEvent.change(pixInput, { target: { value: '150' } });
    expect(pixInput).toHaveValue(100);

    // Tentativa de digitar valor abaixo de 0 é travada em 0
    fireEvent.change(pixInput, { target: { value: '-10' } });
    expect(pixInput).toHaveValue(0);
  });

  it('envia payload correto com os percentuais de desconto ao salvar', () => {
    const onSave = vi.fn();
    render(<ProductModal {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByTestId('input-product-name'), { target: { value: 'Combo VIP' } });
    fireEvent.change(screen.getByTestId('input-product-price-brl'), { target: { value: '250' } });
    fireEvent.change(screen.getByTestId('input-product-pix-discount'), { target: { value: '12' } });
    fireEvent.change(screen.getByTestId('input-product-crypto-discount'), { target: { value: '8' } });
    fireEvent.change(screen.getByTestId('input-product-member-area-url'), { target: { value: 'https://membros.com/vip' } });

    fireEvent.click(screen.getByTestId('save-product-btn'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Combo VIP',
        price_brl: 250,
        pix_discount_percent: 12,
        crypto_discount_percent: 8,
        member_area_url: 'https://membros.com/vip',
      })
    );
  });
});
