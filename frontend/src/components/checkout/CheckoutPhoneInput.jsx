import React, { useState, useRef, useEffect } from 'react';
import { Phone, ChevronDown } from 'lucide-react';
import { DDI_OPTIONS } from './ddiList';
import { maskPhone } from './checkoutUtils';

export default function CheckoutPhoneInput({
  phone = '',
  phoneDdi = '55',
  onChange,
  onDdiChange,
  hasError = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedDdi = DDI_OPTIONS.find((item) => item.code === String(phoneDdi)) || DDI_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectDdi = (code) => {
    onDdiChange(code);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    if (selectedDdi.code === '55') {
      onChange(maskPhone(rawVal));
    } else {
      onChange(rawVal.replace(/[^\d\s\-()]/g, ''));
    }
  };

  return (
    <div className={`checkout-phone-input-container ${hasError ? 'error' : ''}`} ref={dropdownRef}>
      {/* Seletor de DDI */}
      <button
        type="button"
        className="checkout-ddi-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        data-testid="checkout-ddi-button"
      >
        <span className="checkout-ddi-flag">{selectedDdi.flag}</span>
        <span className="checkout-ddi-code">+{selectedDdi.code}</span>
        <ChevronDown size={14} className={`checkout-ddi-chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {/* Menu Suspenso de Países / DDIs */}
      {isOpen && (
        <div className="checkout-ddi-dropdown" role="listbox" data-testid="checkout-ddi-dropdown">
          {DDI_OPTIONS.map((item) => (
            <button
              key={item.code}
              type="button"
              role="option"
              aria-selected={item.code === selectedDdi.code}
              className={`checkout-ddi-option ${item.code === selectedDdi.code ? 'active' : ''}`}
              onClick={() => handleSelectDdi(item.code)}
              data-testid={`checkout-ddi-option-${item.code}`}
            >
              <span className="checkout-ddi-flag">{item.flag}</span>
              <span className="checkout-ddi-name">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Divisor Sutil */}
      <div className="checkout-ddi-divider" />

      {/* Campo de Telefone */}
      <div className="checkout-phone-field-wrapper">
        <Phone size={15} className="checkout-phone-icon" />
        <input
          id="checkout-phone"
          name="phone"
          type="tel"
          placeholder={selectedDdi.placeholder || '(11) 99999-9999'}
          value={phone || ''}
          onChange={handleInputChange}
          className="checkout-phone-input"
          data-testid="checkout-input-phone"
        />
      </div>
    </div>
  );
}
