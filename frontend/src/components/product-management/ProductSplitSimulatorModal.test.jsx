import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductSplitSimulatorModal from './ProductSplitSimulatorModal';
import * as installmentApi from './installmentApi';

describe('ProductSplitSimulatorModal Component', () => {
  const mockProduct = {
    id: 1,
    name: 'Produto Teste Split',
    price_brl: 200.0,
    max_installments: 12,
    free_installments_count: 1,
    interest_rate_percent: 2.99,
    interest_payer: 'buyer',
    offers: [
      { id: 101, name: 'Oferta 1', price_brl: 200.0, is_default: true },
      { id: 102, name: 'Oferta 2', price_brl: 300.0, is_default: false },
    ],
  };

  const mockSimulationData = {
    product_id: 1,
    product_name: 'Produto Teste Split',
    base_price_brl: 200.0,
    max_installments: 12,
    free_installments_count: 1,
    interest_rate_percent: 2.99,
    interest_payer: 'buyer',
    installment_options: [
      {
        installments: 1,
        installment_value: 200.0,
        total_amount: 200.0,
        has_interest: false,
        interest_rate: 0.0,
        label: '1x de R$ 200,00 à vista',
      },
      {
        installments: 12,
        installment_value: 20.12,
        total_amount: 241.44,
        has_interest: true,
        interest_rate: 2.99,
        label: '12x de R$ 20,12 (total: R$ 241,44)',
      },
    ],
    scenarios: [
      {
        scenario_name: 'Pix à Vista',
        payment_method: 'pix',
        installments: 1,
        gross_amount_brl: 200.0,
        gateway_fee_brl: 0.99,
        net_amount_brl: 199.01,
        producer_amount_brl: 139.31,
        producer_percentage: 70.0,
        partners_distribution: [
          {
            recipient_id: 2,
            recipient_name: 'Sócio Beta',
            percentage: 30.0,
            amount_brl: 59.7,
            is_expired: false,
          },
        ],
      },
      {
        scenario_name: 'Cartão de Crédito 1x',
        payment_method: 'credit_card',
        installments: 1,
        gross_amount_brl: 200.0,
        gateway_fee_brl: 8.47,
        net_amount_brl: 191.53,
        producer_amount_brl: 134.07,
        producer_percentage: 70.0,
        partners_distribution: [],
      },
    ],
  };

  beforeEach(() => {
    vi.spyOn(installmentApi, 'fetchInstallmentSimulationApi').mockResolvedValue(mockSimulationData);
  });

  it('renders simulation data, summary bar and comparative scenarios', async () => {
    render(<ProductSplitSimulatorModal isOpen={true} product={mockProduct} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('simulator-summary-bar')).toBeInTheDocument();
    });

    expect(screen.getByText('Pix à Vista')).toBeInTheDocument();
    expect(screen.getByText('Cartão de Crédito 1x')).toBeInTheDocument();
    expect(screen.getByText('Sócio Beta: R$ 59,70')).toBeInTheDocument();
  });

  it('allows changing the offer and triggers new simulation', async () => {
    render(<ProductSplitSimulatorModal isOpen={true} product={mockProduct} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('select-simulator-offer')).toBeInTheDocument();
    });

    const offerSelect = screen.getByTestId('select-simulator-offer');
    fireEvent.change(offerSelect, { target: { value: '102' } });

    expect(installmentApi.fetchInstallmentSimulationApi).toHaveBeenCalledWith(1, '102');
  });

  it('closes modal when clicking close button', async () => {
    const handleClose = vi.fn();
    render(<ProductSplitSimulatorModal isOpen={true} product={mockProduct} onClose={handleClose} />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-close-simulator')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-close-simulator'));
    expect(handleClose).toHaveBeenCalled();
  });
});
