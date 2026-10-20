import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckoutBillingAddress from './CheckoutBillingAddress';

describe('CheckoutBillingAddress Component', () => {
  const defaultAddress = {
    zipCode: '01310-100',
    street: 'Avenida Paulista',
    number: '1500',
    complement: 'Apto 101',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  };

  it('renders all billing address fields properly', () => {
    render(
      <CheckoutBillingAddress
        billingAddress={defaultAddress}
        onChange={vi.fn()}
        onCepBlur={vi.fn()}
      />
    );

    expect(screen.getByTestId('checkout-billing-address')).toBeInTheDocument();
    expect(screen.getByTestId('input-billing-zip-code')).toHaveValue('01310-100');
    expect(screen.getByTestId('input-billing-street')).toHaveValue('Avenida Paulista');
    expect(screen.getByTestId('input-billing-number')).toHaveValue('1500');
    expect(screen.getByTestId('input-billing-complement')).toHaveValue('Apto 101');
    expect(screen.getByTestId('input-billing-neighborhood')).toHaveValue('Bela Vista');
    expect(screen.getByTestId('input-billing-city')).toHaveValue('São Paulo');
    expect(screen.getByTestId('input-billing-state')).toHaveValue('SP');
  });

  it('calls onChange when user types in inputs', () => {
    const onChangeMock = vi.fn();
    render(
      <CheckoutBillingAddress
        billingAddress={{ zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' }}
        onChange={onChangeMock}
        onCepBlur={vi.fn()}
      />
    );

    const streetInput = screen.getByTestId('input-billing-street');
    fireEvent.change(streetInput, { target: { value: 'Rua das Flores' } });
    expect(onChangeMock).toHaveBeenCalledWith('street', 'Rua das Flores');

    const numberInput = screen.getByTestId('input-billing-number');
    fireEvent.change(numberInput, { target: { value: '456' } });
    expect(onChangeMock).toHaveBeenCalledWith('number', '456');
  });

  it('shows loading indicator when loadingCep is true', () => {
    render(
      <CheckoutBillingAddress
        billingAddress={defaultAddress}
        onChange={vi.fn()}
        onCepBlur={vi.fn()}
        loadingCep={true}
      />
    );

    expect(screen.getByText(/Buscando endereço.../i)).toBeInTheDocument();
  });

  it('displays error messages when errors prop is provided', () => {
    const errors = {
      zipCode: 'CEP obrigatório',
      street: 'Rua obrigatória',
      number: 'Número obrigatório',
    };

    render(
      <CheckoutBillingAddress
        billingAddress={{ zipCode: '', street: '', number: '' }}
        onChange={vi.fn()}
        onCepBlur={vi.fn()}
        errors={errors}
      />
    );

    expect(screen.getByText('CEP obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Rua obrigatória')).toBeInTheDocument();
    expect(screen.getByText('Número obrigatório')).toBeInTheDocument();
  });

  it('triggers onCepBlur when lookup button is clicked', () => {
    const onCepBlurMock = vi.fn();
    render(
      <CheckoutBillingAddress
        billingAddress={{ ...defaultAddress, zipCode: '01310-100' }}
        onChange={vi.fn()}
        onCepBlur={onCepBlurMock}
      />
    );

    const lookupBtn = screen.getByTestId('btn-lookup-cep');
    fireEvent.click(lookupBtn);
    expect(onCepBlurMock).toHaveBeenCalledWith('01310-100');
  });
});
