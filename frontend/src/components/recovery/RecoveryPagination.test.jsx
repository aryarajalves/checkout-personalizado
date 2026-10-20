import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RecoveryPagination from './RecoveryPagination';

describe('RecoveryPagination Component', () => {
  it('renders correctly with 0 items', () => {
    render(<RecoveryPagination currentPage={1} pageSize={20} totalItems={0} onPageChange={vi.fn()} />);

    expect(screen.getByText('Nenhum registro para exibir')).toBeInTheDocument();
    expect(screen.getByTestId('btn-pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('btn-pagination-next')).toBeDisabled();
  });

  it('renders 20 items per page boundary on first page', () => {
    const handlePageChange = vi.fn();
    render(
      <RecoveryPagination
        currentPage={1}
        pageSize={20}
        totalItems={45}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByTestId('recovery-pagination-bar')).toHaveTextContent(
      'Mostrando 1 a 20 de 45 carrinhos (20 por página)'
    );

    expect(screen.getByTestId('btn-pagination-prev')).toBeDisabled();
    const nextBtn = screen.getByTestId('btn-pagination-next');
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('renders last page boundary for remaining items', () => {
    const handlePageChange = vi.fn();
    render(
      <RecoveryPagination
        currentPage={3}
        pageSize={20}
        totalItems={45}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByTestId('recovery-pagination-bar')).toHaveTextContent(
      'Mostrando 41 a 45 de 45 carrinhos (20 por página)'
    );

    expect(screen.getByTestId('btn-pagination-next')).toBeDisabled();
    const prevBtn = screen.getByTestId('btn-pagination-prev');
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });
});
