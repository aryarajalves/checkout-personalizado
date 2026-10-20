import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDeleteOrderModal from './ConfirmDeleteOrderModal';

describe('ConfirmDeleteOrderModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmDeleteOrderModal
        isOpen={false}
        order={{ id: 1, order_code: 'ORD-101' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByTestId('confirm-delete-order-modal-content')).not.toBeInTheDocument();
  });

  it('renders single order deletion info', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDeleteOrderModal
        isOpen={true}
        order={{ id: 1, order_code: 'ORD-101', customer_name: 'Marcos Paulo' }}
        selectedCount={0}
        loading={false}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const modal = screen.getByTestId('confirm-delete-order-modal-content');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Excluir Pedido');
    expect(modal).toHaveTextContent('ORD-101');
    expect(modal).toHaveTextContent('Marcos Paulo');
    expect(screen.getByTestId('btn-confirm-delete-order')).toHaveTextContent('Confirmar Exclusão');

    fireEvent.click(screen.getByTestId('btn-cancel-delete-order'));
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('btn-confirm-delete-order'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders bulk deletion info when selectedCount > 1', () => {
    render(
      <ConfirmDeleteOrderModal
        isOpen={true}
        order={null}
        selectedCount={8}
        loading={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const modal = screen.getByTestId('confirm-delete-order-modal-content');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Excluir Pedidos em Massa');
    expect(modal).toHaveTextContent('8 pedidos selecionados');
    expect(screen.getByTestId('btn-confirm-delete-order')).toHaveTextContent('Confirmar Exclusão (8)');
  });

  it('disables buttons and shows spinner when loading is true', () => {
    render(
      <ConfirmDeleteOrderModal
        isOpen={true}
        order={{ id: 1, order_code: 'ORD-101' }}
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('btn-cancel-delete-x')).toBeDisabled();
    expect(screen.getByTestId('btn-cancel-delete-order')).toBeDisabled();
    expect(screen.getByTestId('btn-confirm-delete-order')).toBeDisabled();
    expect(screen.getByText('Excluindo...')).toBeInTheDocument();
  });
});
