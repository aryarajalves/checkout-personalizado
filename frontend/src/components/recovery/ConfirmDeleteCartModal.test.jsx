import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDeleteCartModal from './ConfirmDeleteCartModal';

describe('ConfirmDeleteCartModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmDeleteCartModal
        isOpen={false}
        cart={{ id: 1, customer_name: 'Mateus' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByTestId('confirm-delete-cart-modal-content')).not.toBeInTheDocument();
  });

  it('renders single cart deletion modal and buttons', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDeleteCartModal
        isOpen={true}
        cart={{ id: 1, customer_name: 'Mateus Pereira', customer_email: 'mateus@gmail.com' }}
        selectedCount={0}
        loading={false}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const modal = screen.getByTestId('confirm-delete-cart-modal-content');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Excluir Carrinho Abandonado');
    expect(modal).toHaveTextContent('Mateus Pereira');
    expect(modal).toHaveTextContent('mateus@gmail.com');

    fireEvent.click(screen.getByTestId('btn-cancel-delete-cart'));
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('btn-confirm-delete-cart'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders bulk deletion modal with selected count', () => {
    render(
      <ConfirmDeleteCartModal
        isOpen={true}
        cart={null}
        selectedCount={5}
        loading={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const modal = screen.getByTestId('confirm-delete-cart-modal-content');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Excluir Carrinhos em Massa');
    expect(modal).toHaveTextContent('5 carrinhos abandonados selecionados');
    expect(screen.getByTestId('btn-confirm-delete-cart')).toHaveTextContent('Confirmar Exclusão (5)');
  });

  it('disables buttons and displays loading text when loading is true', () => {
    render(
      <ConfirmDeleteCartModal
        isOpen={true}
        cart={{ id: 1, customer_name: 'Mateus' }}
        loading={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('btn-cancel-delete-cart-x')).toBeDisabled();
    expect(screen.getByTestId('btn-cancel-delete-cart')).toBeDisabled();
    expect(screen.getByTestId('btn-confirm-delete-cart')).toBeDisabled();
    expect(screen.getByText('Excluindo...')).toBeInTheDocument();
  });
});
