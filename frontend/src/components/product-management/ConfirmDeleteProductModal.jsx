import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmDeleteProductModal({
  isOpen,
  product,
  loading,
  onConfirm,
  onCancel,
}) {
  if (!isOpen || !product) return null;

  return (
    <div
      className="modal-backdrop-custom modal-overlay"
      data-testid="confirm-delete-product-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        className="modal-content confirm-delete-modal"
        data-testid="confirm-delete-product-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-delete-icon-wrapper">
          <AlertTriangle size={32} />
        </div>

        <h3 className="confirm-delete-title">
          Excluir Produto
        </h3>

        <p className="confirm-delete-message">
          Tem certeza de que deseja excluir o produto <strong>"{product.name}"</strong>? O link público de checkout deste item deixará de funcionar imediatamente.
        </p>

        <div className="confirm-delete-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onCancel}
            disabled={loading}
            data-testid="cancel-delete-product-btn"
          >
            <X size={15} style={{ marginRight: '4px' }} />
            Cancelar
          </button>
          <button
            type="button"
            className="confirm-danger-btn"
            onClick={() => onConfirm(product.id)}
            disabled={loading}
            data-testid="confirm-delete-product-btn"
          >
            <Trash2 size={15} />
            <span>{loading ? 'Excluindo...' : 'Sim, Excluir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
