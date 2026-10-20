import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductRequirementFields from './ProductRequirementFields';

describe('ProductRequirementFields Component', () => {
  it('renders both CPF and Billing Address toggles', () => {
    const formData = { require_cpf: false, require_billing_address: false };
    const setFormData = vi.fn();

    render(<ProductRequirementFields formData={formData} setFormData={setFormData} />);

    expect(screen.getByTestId('toggle-product-require-cpf')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-product-require-billing-address')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-product-require-cpf')).not.toBeChecked();
    expect(screen.getByTestId('toggle-product-require-billing-address')).not.toBeChecked();
  });

  it('triggers setFormData when toggling require_billing_address', () => {
    const formData = { require_cpf: false, require_billing_address: false };
    const setFormData = vi.fn();

    render(<ProductRequirementFields formData={formData} setFormData={setFormData} />);

    const addressToggle = screen.getByTestId('toggle-product-require-billing-address');
    fireEvent.click(addressToggle);

    expect(setFormData).toHaveBeenCalled();
    const updater = setFormData.mock.calls[0][0];
    const updated = updater(formData);
    expect(updated.require_billing_address).toBe(true);
  });
});
