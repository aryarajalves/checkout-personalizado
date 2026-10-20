import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import TestimonialsEditor from './TestimonialsEditor';

describe('TestimonialsEditor Component', () => {
  const initialTestimonials = [
    {
      id: 1,
      name: 'Maria de Fatima',
      role: 'Fortaleza',
      rating: 5,
      text: 'Gostei muito',
      avatar_url: null,
    },
    {
      id: 2,
      name: 'João Silva',
      role: 'São Paulo',
      rating: 4,
      text: 'Muito bom o produto!',
      avatar_url: 'https://exemplo.com/joao.jpg',
    },
  ];

  it('renderiza a lista de depoimentos com botões de editar e excluir', () => {
    render(<TestimonialsEditor testimonials={initialTestimonials} onChange={vi.fn()} />);

    expect(screen.getByText('Maria de Fatima')).toBeInTheDocument();
    expect(screen.getByText(/Gostei muito/)).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();

    // Botões de editar e excluir
    expect(screen.getByTestId('btn-edit-testimonial-1')).toBeInTheDocument();
    expect(screen.getByTestId('btn-delete-testimonial-1')).toBeInTheDocument();
    expect(screen.getByTestId('btn-edit-testimonial-2')).toBeInTheDocument();
    expect(screen.getByTestId('btn-delete-testimonial-2')).toBeInTheDocument();
  });

  it('permite editar um depoimento existente', () => {
    const handleChange = vi.fn();
    render(<TestimonialsEditor testimonials={initialTestimonials} onChange={handleChange} />);

    // Clica no botão de editar do primeiro depoimento
    fireEvent.click(screen.getByTestId('btn-edit-testimonial-1'));

    // Verifica que o formulário abriu no modo de edição
    expect(screen.getByText('Editar Depoimento')).toBeInTheDocument();
    expect(screen.getByTestId('input-testimonial-name')).toHaveValue('Maria de Fatima');
    expect(screen.getByTestId('input-testimonial-role')).toHaveValue('Fortaleza');
    expect(screen.getByTestId('input-testimonial-text')).toHaveValue('Gostei muito');

    // Altera o texto do depoimento
    fireEvent.change(screen.getByTestId('input-testimonial-text'), {
      target: { value: 'Gostei muito, superou todas as expectativas!' },
    });

    // Salva a edição
    fireEvent.click(screen.getByTestId('btn-confirm-add-testimonial'));

    expect(handleChange).toHaveBeenCalledWith([
      {
        id: 1,
        name: 'Maria de Fatima',
        role: 'Fortaleza',
        rating: 5,
        text: 'Gostei muito, superou todas as expectativas!',
        avatar_url: null,
      },
      initialTestimonials[1],
    ]);
  });

  it('abre popup de confirmação centralizado ao clicar em excluir e permite cancelar', () => {
    const handleChange = vi.fn();
    render(<TestimonialsEditor testimonials={initialTestimonials} onChange={handleChange} />);

    // Clica em excluir do primeiro depoimento
    fireEvent.click(screen.getByTestId('btn-delete-testimonial-1'));

    // Verifica que o popup de confirmação abriu
    expect(screen.getByTestId('modal-delete-testimonial-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('modal-delete-testimonial-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja excluir o depoimento de/i)).toBeInTheDocument();

    // Clica em Cancelar
    fireEvent.click(screen.getByTestId('btn-cancel-delete-testimonial'));

    // Verifica que o popup fechou sem chamar onChange
    expect(screen.queryByTestId('modal-delete-testimonial-backdrop')).not.toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('exclui o depoimento apenas após confirmação no popup', () => {
    const handleChange = vi.fn();
    render(<TestimonialsEditor testimonials={initialTestimonials} onChange={handleChange} />);

    // Clica em excluir
    fireEvent.click(screen.getByTestId('btn-delete-testimonial-1'));

    // Clica em Confirmar Exclusão
    fireEvent.click(screen.getByTestId('btn-confirm-delete-testimonial'));

    // Verifica que onChange foi chamado com o item removido
    expect(handleChange).toHaveBeenCalledWith([initialTestimonials[1]]);
    expect(screen.queryByTestId('modal-delete-testimonial-backdrop')).not.toBeInTheDocument();
  });

  it('exibe botão de upload de arquivo no campo de avatar do depoimento', () => {
    render(<TestimonialsEditor testimonials={[]} onChange={vi.fn()} />);

    // Abre formulário
    fireEvent.click(screen.getByTestId('btn-add-testimonial'));

    // Verifica presença do input e botão de upload
    expect(screen.getByTestId('input-testimonial-avatar')).toBeInTheDocument();
    expect(screen.getByTestId('input-testimonial-avatar-btn-upload')).toBeInTheDocument();
    expect(screen.getByTestId('input-testimonial-avatar-file-input')).toBeInTheDocument();
  });
});
