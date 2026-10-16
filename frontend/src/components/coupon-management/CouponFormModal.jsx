import React, { useState, useEffect } from 'react';
import { Loader2, Tag, Calendar, Hash, Globe, Check } from 'lucide-react';

export default function CouponFormModal({
  isOpen,
  onClose,
  onSave,
  coupon = null,
  products = [],
  loading = false,
}) {
  const [formData, setFormData] = useState({
    code: '',
    discount_percent: 10,
    product_id: '',
    never_expires: true,
    expires_at: '',
    has_limit: false,
    max_uses: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (coupon) {
      let formattedExp = '';
      if (coupon.expires_at) {
        try {
          const d = new Date(coupon.expires_at);
          formattedExp = d.toISOString().slice(0, 16);
        } catch {
          formattedExp = '';
        }
      }
      setFormData({
        code: coupon.code || '',
        discount_percent: coupon.discount_percent || 10,
        product_id: coupon.product_id ? String(coupon.product_id) : '',
        never_expires: coupon.never_expires ?? true,
        expires_at: formattedExp,
        has_limit: coupon.max_uses !== null && coupon.max_uses !== undefined,
        max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
        is_active: coupon.is_active ?? true,
      });
    } else {
      setFormData({
        code: '',
        discount_percent: 10,
        product_id: '',
        never_expires: true,
        expires_at: '',
        has_limit: false,
        max_uses: '',
        is_active: true,
      });
    }
    setErrors({});
  }, [coupon, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.code || formData.code.trim().length < 2) {
      errs.code = 'O código deve ter pelo menos 2 caracteres.';
    }
    const pct = parseFloat(formData.discount_percent);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      errs.discount_percent = 'O desconto deve estar entre 0.1% e 100%.';
    }
    if (!formData.never_expires && !formData.expires_at) {
      errs.expires_at = 'Informe a data e hora de expiração.';
    }
    if (formData.has_limit) {
      const uses = parseInt(formData.max_uses, 10);
      if (isNaN(uses) || uses < 1) {
        errs.max_uses = 'Informe um número válido de utilizações (mínimo 1).';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_percent: parseFloat(formData.discount_percent),
      product_id: formData.product_id ? parseInt(formData.product_id, 10) : null,
      never_expires: formData.never_expires,
      expires_at: !formData.never_expires && formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      max_uses: formData.has_limit && formData.max_uses ? parseInt(formData.max_uses, 10) : null,
      is_active: formData.is_active,
    };

    onSave(payload);
  };

  return (
    <div className="coupon-modal-backdrop" data-testid="coupon-modal-backdrop">
      <div className="coupon-modal-card" onClick={(e) => e.stopPropagation()} data-testid="coupon-modal-card">
        <div className="coupon-modal-header">
          <h3>{coupon ? 'Editar Cupom de Desconto' : 'Novo Cupom de Desconto'}</h3>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Código do Cupom */}
          <div className="coupon-form-group">
            <label htmlFor="coupon-code">Código do Cupom *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="coupon-code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: PROMO20, BLACKFRIDAY"
                data-testid="input-coupon-code"
                style={{ textTransform: 'uppercase', fontWeight: 700 }}
              />
            </div>
            {errors.code && <span style={{ color: '#f87171', fontSize: 12 }}>{errors.code}</span>}
          </div>

          {/* Porcentagem de Desconto */}
          <div className="coupon-form-group">
            <label htmlFor="coupon-discount">Porcentagem de Desconto (%) *</label>
            <input
              id="coupon-discount"
              type="number"
              step="0.5"
              min="0.5"
              max="100"
              value={formData.discount_percent}
              onChange={(e) => setFormData((prev) => ({ ...prev, discount_percent: e.target.value }))}
              placeholder="Ex: 10 para 10%"
              data-testid="input-coupon-discount"
            />
            {errors.discount_percent && (
              <span style={{ color: '#f87171', fontSize: 12 }}>{errors.discount_percent}</span>
            )}
          </div>

          {/* Escopo de Produto */}
          <div className="coupon-form-group">
            <label htmlFor="coupon-product">Produto Aplicável</label>
            <select
              id="coupon-product"
              value={formData.product_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_id: e.target.value }))}
              data-testid="select-coupon-product"
            >
              <option value="">🌐 Todos os Produtos (Cupom Global)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Regras de Expiração */}
          <div className="coupon-box-subgroup">
            <label style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a' }}>
              <Calendar size={15} color="#0284c7" />
              <span>Prazo de Validade</span>
            </label>
            <div style={{ display: 'flex', gap: 16, marginBottom: formData.never_expires ? 0 : 10, color: '#334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="expiration_type"
                  checked={formData.never_expires}
                  onChange={() => setFormData((prev) => ({ ...prev, never_expires: true }))}
                  data-testid="radio-never-expires"
                />
                <span>Nunca Expira (Vitalício)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="expiration_type"
                  checked={!formData.never_expires}
                  onChange={() => setFormData((prev) => ({ ...prev, never_expires: false }))}
                  data-testid="radio-has-expiry"
                />
                <span>Definir Data Limite</span>
              </label>
            </div>

            {!formData.never_expires && (
              <div>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expires_at: e.target.value }))}
                  data-testid="input-coupon-expiry"
                />
                {errors.expires_at && (
                  <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.expires_at}</span>
                )}
              </div>
            )}
          </div>

          {/* Regras de Limite de Usos */}
          <div className="coupon-box-subgroup">
            <label style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a' }}>
              <Hash size={15} color="#16a34a" />
              <span>Limite por Quantidade</span>
            </label>
            <div style={{ display: 'flex', gap: 16, marginBottom: formData.has_limit ? 10 : 0, color: '#334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="limit_type"
                  checked={!formData.has_limit}
                  onChange={() => setFormData((prev) => ({ ...prev, has_limit: false }))}
                  data-testid="radio-unlimited-uses"
                />
                <span>Ilimitado</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="limit_type"
                  checked={formData.has_limit}
                  onChange={() => setFormData((prev) => ({ ...prev, has_limit: true }))}
                  data-testid="radio-limited-uses"
                />
                <span>Limitar Quantidade</span>
              </label>
            </div>

            {formData.has_limit && (
              <div>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData((prev) => ({ ...prev, max_uses: e.target.value }))}
                  placeholder="Ex: 50 compradores"
                  data-testid="input-coupon-max-uses"
                />
                {errors.max_uses && (
                  <span style={{ color: '#f87171', fontSize: 12 }}>{errors.max_uses}</span>
                )}
              </div>
            )}
          </div>

          {/* Status Ativo/Inativo */}
          <div className="coupon-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="coupon-is-active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              data-testid="checkbox-coupon-active"
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <label htmlFor="coupon-is-active" style={{ margin: 0, cursor: 'pointer' }}>
              Cupom Ativo (disponível para resgate no checkout)
            </label>
          </div>

          {/* Ações */}
          <div className="coupon-modal-actions">
            <button
              type="button"
              className="coupon-btn-secondary"
              onClick={onClose}
              disabled={loading}
              data-testid="btn-close-modal"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="coupon-btn-primary"
              disabled={loading}
              data-testid="btn-save-coupon"
            >
              {loading ? <Loader2 size={16} className="checkout-spinner" /> : <Check size={16} />}
              <span>{coupon ? 'Atualizar Cupom' : 'Criar Cupom'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
