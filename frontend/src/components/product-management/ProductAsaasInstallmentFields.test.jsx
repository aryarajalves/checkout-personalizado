import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ProductAsaasInstallmentFields from './ProductAsaasInstallmentFields';

describe('ProductAsaasInstallmentFields - Configuração de Carnê Asaas no Produto', () => {
  it('renderiza o bloco desabilitado quando enable_asaas_installments for false', () => {
    const formData = {
      enable_asaas_installments: false,
    };
    render(<ProductAsaasInstallmentFields formData={formData} setFormData={vi.fn()} />);

    expect(screen.getByTestId('asaas-installments-config-section')).toBeInTheDocument();
    expect(screen.getByText('Desabilitado')).toBeInTheDocument();
    expect(screen.queryByTestId('select-asaas-max-installments')).not.toBeInTheDocument();
  });

  it('habilita e exibe campos ao marcar o checkbox', () => {
    const setFormData = vi.fn();
    const formData = {
      enable_asaas_installments: false,
    };
    render(<ProductAsaasInstallmentFields formData={formData} setFormData={setFormData} />);

    const toggle = screen.getByTestId('toggle-asaas-installments');
    fireEvent.click(toggle);

    expect(setFormData).toHaveBeenCalled();
  });

  it('renderiza campos de parcelas e juros quando habilitado', () => {
    const formData = {
      enable_asaas_installments: true,
      asaas_max_installments: 12,
      asaas_interest_percent: 1.99,
      asaas_require_entry_pix: true,
    };
    const setFormData = vi.fn();

    render(<ProductAsaasInstallmentFields formData={formData} setFormData={setFormData} />);

    expect(screen.getByTestId('select-asaas-max-installments')).toBeInTheDocument();
    expect(screen.getByTestId('input-asaas-interest-percent')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-asaas-require-entry-pix')).toBeInTheDocument();

    // Alterar taxa de juros
    fireEvent.change(screen.getByTestId('input-asaas-interest-percent'), { target: { value: '2.5' } });
    expect(setFormData).toHaveBeenCalled();

    // Alterar parcelas máximas
    fireEvent.change(screen.getByTestId('select-asaas-max-installments'), { target: { value: '6' } });
    expect(setFormData).toHaveBeenCalled();
  });
});
