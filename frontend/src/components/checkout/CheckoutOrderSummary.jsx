import React from 'react';
import { ShieldCheck, Lock, Zap, Award, Package } from 'lucide-react';
import { formatCurrency } from './checkoutUtils';
import CheckoutTestimonials from './CheckoutTestimonials';

export default function CheckoutOrderSummary({
  product,
  selectedOffer,
  paymentMethod,
  selectedBumps = [],
  totalOverrideBrl,
  totalOverrideUsd,
  usdRate,
  appliedCoupon,
  paymentMethodDiscount,
}) {
  if (!product) return null;

  const currentPriceBrl = selectedOffer?.price_brl ?? product.price_brl;
  const currentPriceUsd = selectedOffer?.price_usd ?? product.price_usd;
  const isCrypto = paymentMethod === 'crypto';
  const effectiveTotalBrl = totalOverrideBrl !== undefined ? totalOverrideBrl : currentPriceBrl;
  const rate = usdRate || (currentPriceUsd && currentPriceBrl > 0 ? currentPriceUsd / currentPriceBrl : null);
  const effectiveTotalUsd = totalOverrideUsd !== undefined ? totalOverrideUsd : (isCrypto && rate ? effectiveTotalBrl * rate : currentPriceUsd);

  return (
    <div className="checkout-summary-card" data-testid="checkout-order-summary">
      <div className="checkout-summary-header">
        <h3 className="checkout-summary-title">Resumo do Pedido</h3>
      </div>

      <div className="checkout-product-preview">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="checkout-product-image"
          />
        ) : (
          <div className="checkout-product-image-fallback">
            <Package size={32} className="checkout-product-fallback-icon" />
          </div>
        )}

        <div className="checkout-product-info">
          <h4 className="checkout-product-name">{product.name}</h4>
          {selectedOffer && selectedOffer.name !== product.name && (
            <span className="checkout-offer-badge" data-testid="checkout-offer-badge">
              Oferta: {selectedOffer.name}
            </span>
          )}
          {product.description && (
            <p className="checkout-product-description">{product.description}</p>
          )}
        </div>
      </div>

      <div className="checkout-pricing-table">
        <div className="checkout-pricing-row">
          <span className="checkout-pricing-label">Item Principal</span>
          <span className="checkout-pricing-val">
            {isCrypto && currentPriceUsd
              ? formatCurrency(currentPriceUsd, 'USD')
              : formatCurrency(currentPriceBrl, 'BRL')}
          </span>
        </div>

        {selectedBumps && selectedBumps.length > 0 && selectedBumps.map((b) => {
          const bumpUsd = rate ? b.price_brl * rate : null;
          return (
            <div className="checkout-pricing-row bump" key={b.id} data-testid={`summary-bump-${b.id}`} style={{ color: '#16a34a' }}>
              <span className="checkout-pricing-label">+ {b.title}</span>
              <span className="checkout-pricing-val">
                {isCrypto && bumpUsd
                  ? `${formatCurrency(bumpUsd, 'USD')} (~${formatCurrency(b.price_brl, 'BRL')})`
                  : formatCurrency(b.price_brl, 'BRL')}
              </span>
            </div>
          );
        })}

        {appliedCoupon && (
          <div className="checkout-pricing-row coupon" data-testid="summary-applied-coupon" style={{ color: '#059669', fontWeight: 600 }}>
            <span className="checkout-pricing-label">
              Cupom ({appliedCoupon.code}) • -{appliedCoupon.discount_percent}%
            </span>
            <span className="checkout-pricing-val">
              - {isCrypto && appliedCoupon.discount_amount_usd
                ? formatCurrency(appliedCoupon.discount_amount_usd, 'USD')
                : formatCurrency(appliedCoupon.discount_amount_brl, 'BRL')}
            </span>
          </div>
        )}

        {paymentMethodDiscount && paymentMethodDiscount.percent > 0 && (
          <div className="checkout-pricing-row method-discount" data-testid="summary-method-discount" style={{ color: '#0284c7', fontWeight: 600 }}>
            <span className="checkout-pricing-label">
              {paymentMethod === 'pix' ? `🔥 Desconto Pix (${paymentMethodDiscount.percent}%)` : `⚡ Desconto Cripto (${paymentMethodDiscount.percent}%)`}
            </span>
            <span className="checkout-pricing-val">
              - {isCrypto && paymentMethodDiscount.amount_usd
                ? formatCurrency(paymentMethodDiscount.amount_usd, 'USD')
                : formatCurrency(paymentMethodDiscount.amount_brl, 'BRL')}
            </span>
          </div>
        )}

        <div className="checkout-pricing-row total">
          <span className="checkout-total-label">Total a Pagar</span>
          <div className="checkout-total-val-box">
            <span className="checkout-total-val" data-testid="checkout-total-price">
              {isCrypto && effectiveTotalUsd
                ? formatCurrency(effectiveTotalUsd, 'USD')
                : formatCurrency(effectiveTotalBrl, 'BRL')}
            </span>
            {isCrypto && effectiveTotalBrl && (
              <span className="checkout-crypto-equiv">
                Equiv. aprox. {formatCurrency(effectiveTotalBrl, 'BRL')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selos de Confiança e Garantia */}
      <div className="checkout-trust-badges">
        <div className="checkout-badge-item">
          <ShieldCheck size={18} className="checkout-badge-icon" />
          <span>Compra 100% Segura</span>
        </div>
        <div className="checkout-badge-item">
          <Lock size={18} className="checkout-badge-icon" />
          <span>Privacidade Protegida</span>
        </div>
        <div className="checkout-badge-item">
          <Zap size={18} className="checkout-badge-icon" />
          <span>Acesso Imediato</span>
        </div>
        <div className="checkout-badge-item">
          <Award size={18} className="checkout-badge-icon" />
          <span>Garantia de 7 Dias</span>
        </div>
      </div>

      {/* Depoimentos e Prova Social */}
      <CheckoutTestimonials testimonials={product.testimonials} />
    </div>
  );
}
