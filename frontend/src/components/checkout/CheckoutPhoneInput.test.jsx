import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CheckoutPhoneInput from './CheckoutPhoneInput';

describe('CheckoutPhoneInput Component', () => {
  it('renders default Brazil DDI (+55) with flag and phone input', () => {
    render(
      <CheckoutPhoneInput
        phone=""
        phoneDdi="55"
        onChange={vi.fn()}
        onDdiChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('checkout-ddi-button')).toHaveTextContent('+55');
    expect(screen.getByTestId('checkout-ddi-button')).toHaveTextContent('🇧🇷');
    expect(screen.getByTestId('checkout-input-phone')).toHaveAttribute('placeholder', '(11) 99999-9999');
  });

  it('opens DDI dropdown when button is clicked and lists countries', () => {
    render(
      <CheckoutPhoneInput
        phone=""
        phoneDdi="55"
        onChange={vi.fn()}
        onDdiChange={vi.fn()}
      />
    );

    const ddiBtn = screen.getByTestId('checkout-ddi-button');
    fireEvent.click(ddiBtn);

    expect(screen.getByTestId('checkout-ddi-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-ddi-option-351')).toHaveTextContent('Portugal (+351)');
    expect(screen.getByTestId('checkout-ddi-option-1')).toHaveTextContent('Estados Unidos (+1)');
    expect(screen.getByTestId('checkout-ddi-option-34')).toHaveTextContent('Espanha (+34)');
  });

  it('selects another country DDI and calls onDdiChange', () => {
    const handleDdiChange = vi.fn();
    render(
      <CheckoutPhoneInput
        phone=""
        phoneDdi="55"
        onChange={vi.fn()}
        onDdiChange={handleDdiChange}
      />
    );

    fireEvent.click(screen.getByTestId('checkout-ddi-button'));
    fireEvent.click(screen.getByTestId('checkout-ddi-option-351'));

    expect(handleDdiChange).toHaveBeenCalledWith('351');
    expect(screen.queryByTestId('checkout-ddi-dropdown')).not.toBeInTheDocument();
  });

  it('applies Brazilian mask when DDI is 55', () => {
    const handleChange = vi.fn();
    render(
      <CheckoutPhoneInput
        phone=""
        phoneDdi="55"
        onChange={handleChange}
        onDdiChange={vi.fn()}
      />
    );

    const input = screen.getByTestId('checkout-input-phone');
    fireEvent.change(input, { target: { value: '11988887777' } });

    expect(handleChange).toHaveBeenCalledWith('(11) 98888-7777');
  });

  it('allows typing international digits when DDI is not 55', () => {
    const handleChange = vi.fn();
    render(
      <CheckoutPhoneInput
        phone=""
        phoneDdi="351"
        onChange={handleChange}
        onDdiChange={vi.fn()}
      />
    );

    const input = screen.getByTestId('checkout-input-phone');
    fireEvent.change(input, { target: { value: '912 345 678' } });

    expect(handleChange).toHaveBeenCalledWith('912 345 678');
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <span data-testid="outside-element">Outside</span>
        <CheckoutPhoneInput
          phone=""
          phoneDdi="55"
          onChange={vi.fn()}
          onDdiChange={vi.fn()}
        />
      </div>
    );

    fireEvent.click(screen.getByTestId('checkout-ddi-button'));
    expect(screen.getByTestId('checkout-ddi-dropdown')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside-element'));
    expect(screen.queryByTestId('checkout-ddi-dropdown')).not.toBeInTheDocument();
  });
});
