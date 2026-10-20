import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OrdersPagination from './OrdersPagination';

describe('OrdersPagination Component', () => {
  it('renders correctly when there are no items', () => {
    render(<OrdersPagination currentPage={1} pageSize={20} totalItems={0} onPageChange={vi.fn()} />);

    expect(screen.getByText('Nenhum registro para exibir')).toBeInTheDocument();
    expect(screen.getByTestId('btn-pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('btn-pagination-next')).toBeDisabled();
  });

  it('renders pagination details for first page', () => {
    const handlePageChange = vi.fn();
    render(
      <OrdersPagination
        currentPage={1}
        pageSize={20}
        totalItems={45}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByTestId('orders-pagination-bar')).toHaveTextContent(
      'Mostrando 1 a 20 de 45 pedidos (20 por página)'
    );

    // Prev disabled, Next enabled
    expect(screen.getByTestId('btn-pagination-prev')).toBeDisabled();
    const nextBtn = screen.getByTestId('btn-pagination-next');
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('renders pagination details for last page', () => {
    const handlePageChange = vi.fn();
    render(
      <OrdersPagination
        currentPage={3}
        pageSize={20}
        totalItems={45}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByTestId('orders-pagination-bar')).toHaveTextContent(
      'Mostrando 41 a 45 de 45 pedidos (20 por página)'
    );

    expect(screen.getByTestId('btn-pagination-next')).toBeDisabled();
    const prevBtn = screen.getByTestId('btn-pagination-prev');
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('renders smart ellipses when total pages exceed 7', () => {
    render(
      <OrdersPagination
        currentPage={5}
        pageSize={20}
        totalItems={300}
        onPageChange={vi.fn()}
      />
    );

    // Should show 1, ..., 4, 5, 6, ..., 15
    expect(screen.getByTestId('btn-pagination-page-1')).toBeInTheDocument();
    expect(screen.getByTestId('btn-pagination-page-4')).toBeInTheDocument();
    expect(screen.getByTestId('btn-pagination-page-5')).toBeInTheDocument();
    expect(screen.getByTestId('btn-pagination-page-6')).toBeInTheDocument();
    expect(screen.getByTestId('btn-pagination-page-15')).toBeInTheDocument();
  });
});
