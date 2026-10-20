import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import CheckoutAsaasCarnetPayment from './CheckoutAsaasCarnetPayment';
import * as checkoutApi from './checkoutApi';

describe('CheckoutAsaasCarnetPayment - Exibição de Entrada Pix e Cronograma do Carnê', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrder = {
    order_id: 123,
    order_code: 'ORD-ASAAS-999',
    status: 'pending',
    amount_brl: 1200,
    qr_code_text: '00020126580014br.gov.bcb.pix0136testasaasentry',
    qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    bank_slip_url: 'https://sandbox.asaas.com/b/pdf/test-carnet',
    installments_list: [
      {
        id: 1,
        installment_number: 1,
        total_installments: 3,
        amount_brl: 400,
        due_date: '2026-10-19',
        status: 'pending',
        payment_method: 'pix',
      },
      {
        id: 2,
        installment_number: 2,
        total_installments: 3,
        amount_brl: 400,
        due_date: '2026-11-19',
        status: 'pending',
        payment_method: 'boleto',
      },
      {
        id: 3,
        installment_number: 3,
        total_installments: 3,
        amount_brl: 400,
        due_date: '2026-12-19',
        status: 'pending',
        payment_method: 'boleto',
      },
    ],
  };

  it('renderiza o QR Code e código Copia e Cola da Entrada Pix', () => {
    render(<CheckoutAsaasCarnetPayment order={mockOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    expect(screen.getByTestId('asaas-carnet-payment-screen')).toBeInTheDocument();
    expect(screen.getByTestId('asaas-entry-qr-image')).toBeInTheDocument();
    expect(screen.getByTestId('asaas-entry-pix-code')).toHaveValue(mockOrder.qr_code_text);
    expect(screen.getByTestId('btn-copy-asaas-entry-pix')).toBeInTheDocument();
  });

  it('renderiza o cronograma com todas as parcelas do carnê', () => {
    render(<CheckoutAsaasCarnetPayment order={mockOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    expect(screen.getByTestId('carnet-installment-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('carnet-installment-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('carnet-installment-item-3')).toBeInTheDocument();
    expect(screen.getByTestId('carnet-installment-item-1')).toHaveTextContent('1ª Parcela (Entrada Pix)');
  });

  it('copia o código Pix para a área de transferência ao clicar no botão Copiar', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<CheckoutAsaasCarnetPayment order={mockOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    const copyBtn = screen.getByTestId('btn-copy-asaas-entry-pix');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(mockOrder.qr_code_text);
    await waitFor(() => {
      expect(screen.getByText('Copiado!')).toBeInTheDocument();
    });
  });

  it('renderiza tela de sucesso quando o status for pago', () => {
    const paidOrder = { ...mockOrder, status: 'paid' };
    render(<CheckoutAsaasCarnetPayment order={paidOrder} onBack={vi.fn()} onOrderPaid={vi.fn()} />);

    expect(screen.getByTestId('asaas-carnet-success-screen')).toBeInTheDocument();
    expect(screen.getByText('🎉 Entrada Confirmada & Acesso Liberado!')).toBeInTheDocument();
    expect(screen.getByTestId('link-download-carnet-pdf')).toHaveAttribute('href', mockOrder.bank_slip_url);
  });
});
