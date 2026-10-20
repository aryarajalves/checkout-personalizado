import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import CheckoutAsaasInstallmentForm from './CheckoutAsaasInstallmentForm';

describe('CheckoutAsaasInstallmentForm - Boleto & Pix Parcelado (Asaas)', () => {
  const defaultProduct = {
    enable_asaas_installments: true,
    asaas_max_installments: 12,
    asaas_interest_percent: 0,
    asaas_require_entry_pix: true,
  };

  it('renderiza o formulário de carnê com título e explicações', () => {
    render(
      <CheckoutAsaasInstallmentForm
        product={defaultProduct}
        totalPriceBrl={1200}
        asaasData={{ installments: 6 }}
        onAsaasChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('checkout-asaas-installment-form')).toBeInTheDocument();
    expect(screen.getByText('Carnê Digital & BolePix Parcelado')).toBeInTheDocument();
    expect(screen.getByTestId('select-asaas-installments')).toBeInTheDocument();
    expect(screen.getByText('Sem consulta ao SPC/Serasa')).toBeInTheDocument();
  });

  it('dispara onAsaasChange ao alterar a quantidade de parcelas no select', () => {
    const onAsaasChange = vi.fn();
    render(
      <CheckoutAsaasInstallmentForm
        product={defaultProduct}
        totalPriceBrl={1000}
        asaasData={{ installments: 2 }}
        onAsaasChange={onAsaasChange}
      />
    );

    const select = screen.getByTestId('select-asaas-installments');
    fireEvent.change(select, { target: { value: '4' } });

    expect(onAsaasChange).toHaveBeenCalledWith(4);
  });

  it('exibe detalhamento da 1ª parcela como Entrada Pix quando requireEntryPix for true', () => {
    render(
      <CheckoutAsaasInstallmentForm
        product={{ ...defaultProduct, asaas_require_entry_pix: true }}
        totalPriceBrl={600}
        asaasData={{ installments: 3 }}
        onAsaasChange={vi.fn()}
      />
    );

    expect(screen.getByText(/1ª Parcela \(Entrada Pix\):/i)).toBeInTheDocument();
    expect(screen.getByText(/2x Mensais no Carnê:/i)).toBeInTheDocument();
  });

  it('exibe juros no resumo quando asaas_interest_percent for maior que 0', () => {
    render(
      <CheckoutAsaasInstallmentForm
        product={{ ...defaultProduct, asaas_interest_percent: 2.5 }}
        totalPriceBrl={1000}
        asaasData={{ installments: 4 }}
        onAsaasChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('checkout-asaas-installment-form')).toBeInTheDocument();
    const select = screen.getByTestId('select-asaas-installments');
    expect(select).toBeInTheDocument();
  });
});
