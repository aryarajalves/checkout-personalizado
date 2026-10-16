import React, { useState } from 'react';
import { Tag, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { validateCouponApi } from './checkoutApi';
import { formatCurrency } from './checkoutUtils';

export default function CheckoutCouponBox({
  slug,
  selectedBumpIds = [],
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
}) {
  const [couponInput, setCouponInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleApply = async (e) => {
    if (e) e.preventDefault();
    const clean = couponInput.trim();
    if (!clean) {
      setErrorMsg('Digite o código do cupom.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await validateCouponApi(clean, slug, selectedBumpIds);

      if (data && data.valid) {
        onApplyCoupon(data);
        setCouponInput('');
        setErrorMsg(null);
      } else {
        setErrorMsg(data?.message || 'Cupom inválido.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao validar cupom de desconto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-coupon-container" data-testid="checkout-coupon-box" style={{ marginBottom: 16 }}>
      {appliedCoupon ? (
        <div
          className="checkout-applied-coupon-card"
          data-testid="applied-coupon-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            color: '#065f46',
            fontSize: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{appliedCoupon.code}</span>
                <span
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 800,
                  }}
                >
                  {appliedCoupon.discount_percent}% OFF
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#047857' }}>
                Economia de {formatCurrency(appliedCoupon.discount_amount_brl, 'BRL')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemoveCoupon}
            data-testid="remove-coupon-btn"
            title="Remover cupom"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#059669',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            <X size={16} />
            <span>Remover</span>
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '6px 8px 6px 12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Tag size={16} color="#64748b" />
            <input
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApply();
                }
              }}
              placeholder="Possui cupom de desconto?"
              aria-label="Código do cupom de desconto"
              data-testid="coupon-input"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                color: '#1e293b',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            />
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !couponInput.trim()}
              data-testid="apply-coupon-btn"
              style={{
                backgroundColor: couponInput.trim() ? '#0f172a' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: couponInput.trim() && !loading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? <Loader2 size={14} className="checkout-spinner" /> : null}
              <span>Aplicar</span>
            </button>
          </div>

          {errorMsg && (
            <div
              data-testid="coupon-error-msg"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                color: '#dc2626',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
