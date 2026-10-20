import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUploadInput from './ImageUploadInput';

describe('ImageUploadInput Component', () => {
  it('renderiza o label, placeholder e input de texto corretamente', () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadInput
        label="Logotipo da Marca"
        value=""
        onChange={handleChange}
        placeholder="https://exemplo.com/logo.png"
        helperText="Formato aceito: PNG ou JPG"
        testId="input-logo-test"
      />
    );

    expect(screen.getByText('Logotipo da Marca')).toBeInTheDocument();
    expect(screen.getByText('Formato aceito: PNG ou JPG')).toBeInTheDocument();
    const input = screen.getByTestId('input-logo-test');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getByText('Upload Arquivo')).toBeInTheDocument();
  });

  it('renderiza a pré-visualização visual da imagem/logo quando há valor preenchido', () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadInput
        label="Foto de Avatar"
        value="https://exemplo.com/dona-maria.jpg"
        onChange={handleChange}
        testId="input-avatar-test"
      />
    );

    // Deve exibir o card de pré-visualização renderizada
    expect(screen.getByTestId('input-avatar-test-preview-card')).toBeInTheDocument();
    const previewImg = screen.getByTestId('input-avatar-test-preview-img');
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute('src', 'https://exemplo.com/dona-maria.jpg');
    expect(screen.getByText('Imagem / Logo Renderizada')).toBeInTheDocument();
  });

  it('permite remover a imagem clicando no botão Remover do preview', () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadInput
        label="Foto de Avatar"
        value="https://exemplo.com/dona-maria.jpg"
        onChange={handleChange}
        testId="input-avatar-test"
      />
    );

    const removeBtn = screen.getByTestId('input-avatar-test-btn-remove-preview');
    fireEvent.click(removeBtn);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('chama onChange quando o usuário digita uma URL no campo de texto', () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadInput
        label="Capa do Produto"
        value=""
        onChange={handleChange}
        testId="input-cover-test"
      />
    );

    const input = screen.getByTestId('input-cover-test');
    fireEvent.change(input, { target: { value: 'https://exemplo.com/nova-capa.png' } });

    expect(handleChange).toHaveBeenCalledWith('https://exemplo.com/nova-capa.png');
  });

  it('aciona o seletor de arquivo ao clicar no botão Upload Arquivo', () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadInput
        label="Capa do Produto"
        value=""
        onChange={handleChange}
        testId="input-cover-test"
      />
    );

    const uploadBtn = screen.getByTestId('input-cover-test-btn-upload');
    const fileInput = screen.getByTestId('input-cover-test-file-input');

    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(uploadBtn);

    expect(clickSpy).toHaveBeenCalled();
  });
});
