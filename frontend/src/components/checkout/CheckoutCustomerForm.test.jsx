import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CheckoutCustomerForm from './CheckoutCustomerForm';

describe('CheckoutCustomerForm Component', () => {
  const baseFormData = {
    name: 'João Silva',
    email: 'joao@silva.com',
    phone: '(11) 99999-9999',
    phone_ddi: '55',
    cpf: '',
  };

  it('renders name, email, phone with DDI selector and without CPF when not required', () => {
    render(
      <CheckoutCustomerForm
        formData={baseFormData}
        onChange={vi.fn()}
        errors={{}}
        requireCpf={false}
      />
    );

    expect(screen.getByTestId('checkout-input-name')).toHaveValue('João Silva');
    expect(screen.getByTestId('checkout-input-email')).toHaveValue('joao@silva.com');
    expect(screen.getByTestId('checkout-input-phone')).toHaveValue('(11) 99999-9999');
    expect(screen.getByTestId('checkout-ddi-button')).toHaveTextContent('+55');
    expect(screen.queryByTestId('checkout-input-cpf')).not.toBeInTheDocument();
  });

  it('renders CPF input when requireCpf is true', () => {
    render(
      <CheckoutCustomerForm
        formData={baseFormData}
        onChange={vi.fn()}
        errors={{}}
        requireCpf={true}
      />
    );

    expect(screen.getByTestId('checkout-input-cpf')).toBeInTheDocument();
  });

  it('triggers onChange with phone_ddi when a new DDI is selected', () => {
    const handleChange = vi.fn();
    render(
      <CheckoutCustomerForm
        formData={baseFormData}
        onChange={handleChange}
        errors={{}}
        requireCpf={false}
      />
    );

    fireEvent.click(screen.getByTestId('checkout-ddi-button'));
    fireEvent.click(screen.getByTestId('checkout-ddi-option-351'));

    expect(handleChange).toHaveBeenCalledWith({
      target: { name: 'phone_ddi', value: '351' },
    });
  });

  it('triggers onChange with masked phone when typing in phone input with Brazil DDI', () => {
    const handleChange = vi.fn();
    render(
      <CheckoutCustomerForm
        formData={baseFormData}
        onChange={handleChange}
        errors={{}}
        requireCpf={false}
      />
    );

    fireEvent.change(screen.getByTestId('checkout-input-phone'), {
      target: { value: '11988887777' },
    });

    expect(handleChange).toHaveBeenCalledWith({
      target: { name: 'phone', value: '(11) 98888-7777' },
    });
  });
});
