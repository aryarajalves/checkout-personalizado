import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProductInstallmentFields from './ProductInstallmentFields';

describe('ProductInstallmentFields Component', () => {
  it('renders all installment configuration fields with default values', () => {
    const formData = {
      max_installments: 12,
      free_installments_count: 1,
      interest_rate_percent: 2.99,
      interest_payer: 'buyer',
    };
    const setFormData = vi.fn();

    render(<ProductInstallmentFields formData={formData} setFormData={setFormData} />);

    expect(screen.getByTestId('installment-rules-config-section')).toBeInTheDocument();
    expect(screen.getByTestId('select-product-max-installments')).toHaveValue('12');
    expect(screen.getByTestId('select-product-free-installments')).toHaveValue('1');
    expect(screen.getByTestId('input-product-interest-rate')).toHaveValue(2.99);
    expect(screen.getByTestId('btn-interest-payer-buyer')).toHaveClass('active');
  });

  it('handles changes to max installments and interest rate', () => {
    const formData = {
      max_installments: 12,
      free_installments_count: 3,
      interest_rate_percent: 2.99,
      interest_payer: 'buyer',
    };
    const setFormData = vi.fn();

    render(<ProductInstallmentFields formData={formData} setFormData={setFormData} />);

    const maxSelect = screen.getByTestId('select-product-max-installments');
    fireEvent.change(maxSelect, { target: { value: '6' } });
    expect(setFormData).toHaveBeenCalled();

    const rateInput = screen.getByTestId('input-product-interest-rate');
    fireEvent.change(rateInput, { target: { value: '1.99' } });
    expect(setFormData).toHaveBeenCalled();
  });

  it('switches interest payer between buyer and producer', () => {
    const formData = {
      max_installments: 12,
      free_installments_count: 1,
      interest_rate_percent: 2.99,
      interest_payer: 'buyer',
    };
    const setFormData = vi.fn();

    render(<ProductInstallmentFields formData={formData} setFormData={setFormData} />);

    const producerBtn = screen.getByTestId('btn-interest-payer-producer');
    fireEvent.click(producerBtn);

    expect(setFormData).toHaveBeenCalled();
  });
});
