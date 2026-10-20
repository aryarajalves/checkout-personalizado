import React from 'react';
import CheckoutBuilderModal from '../checkout-builder/CheckoutBuilderModal';

/**
 * ProductAppearanceModal
 * Re-exporta e renderiza o CheckoutBuilderModal com editor visual lado a lado (Desktop & Mobile).
 * Mantém retrocompatibilidade total com imports existentes e suítes de testes.
 */
export function ProductAppearanceModal(props) {
  return <CheckoutBuilderModal {...props} />;
}

export default ProductAppearanceModal;
