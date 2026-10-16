import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import ProductSplitModal from './ProductSplitModal';

describe('ProductSplitModal - Co-Produção com Prazo de Contrato (valid_until)', () => {
  const mockProduct = {
    id: 10,
    name: 'Mentoria High Ticket',
    price_brl: 1000.0,
    split_rules: [
      {
        recipient_id: 1,
        percentage: 70.0,
        valid_until: null,
        is_expired: false,
      },
      {
        recipient_id: 2,
        percentage: 30.0,
        valid_until: '2026-09-01T23:59:59Z',
        is_expired: true,
      },
    ],
  };

  const mockAvailableRecipients = [
    { id: 1, name: 'Sócio Fundador', document: '111.111.111-11' },
    { id: 2, name: 'Agência de Lançamento', document: '222.222.222-22' },
    { id: 3, name: 'Co-produtor Novo', document: '333.333.333-33' },
  ];

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <ProductSplitModal
        isOpen={false}
        product={mockProduct}
        availableRecipients={mockAvailableRecipients}
        loading={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza regras existentes, identificando contrato expirado e ativo', () => {
    render(
      <ProductSplitModal
        isOpen={true}
        product={mockProduct}
        availableRecipients={mockAvailableRecipients}
        loading={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Divisão de Split: Mentoria High Ticket')).toBeInTheDocument();

    // Input da regra permanente (sem data)
    const validUntil0 = screen.getByTestId('input-split-valid-until-0');
    expect(validUntil0.value).toBe('');

    // Input da regra temporária expirada
    const validUntil1 = screen.getByTestId('input-split-valid-until-1');
    expect(validUntil1.value).toBe('2026-09-01');

    // Badge de contrato expirado
    expect(screen.getByTestId('badge-expired-1')).toBeInTheDocument();
    expect(screen.getByTestId('badge-expired-1')).toHaveTextContent('Expirado');
  });

  it('permite definir e alterar a data de término de contrato de co-produção', () => {
    const onSaveMock = vi.fn();

    render(
      <ProductSplitModal
        isOpen={true}
        product={mockProduct}
        availableRecipients={mockAvailableRecipients}
        loading={false}
        onSave={onSaveMock}
        onCancel={vi.fn()}
      />
    );

    const validUntil0 = screen.getByTestId('input-split-valid-until-0');
    fireEvent.change(validUntil0, { target: { value: '2026-12-31' } });

    expect(validUntil0.value).toBe('2026-12-31');

    // Salvar o modal
    const saveBtn = screen.getByTestId('save-split-modal-btn');
    fireEvent.click(saveBtn);

    expect(onSaveMock).toHaveBeenCalledTimes(1);
    const savedRules = onSaveMock.mock.calls[0][1];

    expect(savedRules[0].valid_until).toBe('2026-12-31T23:59:59Z');
    expect(savedRules[1].valid_until).toBe('2026-09-01T23:59:59Z');
  });

  it('permite adicionar novo sócio com prazo de contrato e salvar com sucesso', () => {
    const onSaveMock = vi.fn();
    const productWithoutSecondRule = {
      ...mockProduct,
      split_rules: [
        { recipient_id: 1, percentage: 60.0, valid_until: null, is_expired: false },
      ],
    };

    render(
      <ProductSplitModal
        isOpen={true}
        product={productWithoutSecondRule}
        availableRecipients={mockAvailableRecipients}
        loading={false}
        onSave={onSaveMock}
        onCancel={vi.fn()}
      />
    );

    const addBtn = screen.getByTestId('add-split-rule-btn');
    fireEvent.click(addBtn);

    // Nova linha adicionada com índice 1
    const newDateInput = screen.getByTestId('input-split-valid-until-1');
    fireEvent.change(newDateInput, { target: { value: '2027-06-30' } });

    const saveBtn = screen.getByTestId('save-split-modal-btn');
    fireEvent.click(saveBtn);

    expect(onSaveMock).toHaveBeenCalledTimes(1);
    const savedRules = onSaveMock.mock.calls[0][1];
    expect(savedRules).toHaveLength(2);
    expect(savedRules[0].valid_until).toBeNull();
    expect(savedRules[1].valid_until).toBe('2027-06-30T23:59:59Z');
  });
});
