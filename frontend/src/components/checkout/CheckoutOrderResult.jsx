import React from 'react';
import CheckoutPixPayment from './CheckoutPixPayment';
import CheckoutCryptoPayment from './CheckoutCryptoPayment';
import CheckoutPostPurchaseAction from './CheckoutPostPurchaseAction';
import { formatCurrency } from './checkoutUtils';

export default function CheckoutOrderResult({
  createdOrder,
  customerName = '',
  onBack,
  onOrderPaid,
  hasActiveUpsell = false,
  postPurchaseTargetUrl = '#',
  redirectCountdown = 3,
}) {
  if (!createdOrder) return null;

  // Pix simples ou Entrada Pix do pagamento híbrido aguardando quitação
  const isPixWaiting =
    createdOrder.payment_method === 'pix' ||
    (createdOrder.payment_method === 'hybrid_pix_card' && createdOrder.status !== 'paid');

  if (isPixWaiting) {
    return (
      <div data-testid="checkout-order-result-pix">
        <CheckoutPixPayment
          order={createdOrder}
          onBack={onBack}
          onOrderPaid={onOrderPaid}
        />
        <CheckoutPostPurchaseAction
          createdOrder={createdOrder}
          hasActiveUpsell={hasActiveUpsell}
          postPurchaseTargetUrl={postPurchaseTargetUrl}
          redirectCountdown={redirectCountdown}
          testId={hasActiveUpsell ? "upsell-pix-link" : "thank-you-pix-link"}
        />
      </div>
    );
  }

  if (createdOrder.payment_method === 'crypto') {
    return (
      <div data-testid="checkout-order-result-crypto">
        <CheckoutCryptoPayment
          order={createdOrder}
          onBack={onBack}
          onOrderPaid={onOrderPaid}
        />
        <CheckoutPostPurchaseAction
          createdOrder={createdOrder}
          hasActiveUpsell={hasActiveUpsell}
          postPurchaseTargetUrl={postPurchaseTargetUrl}
          redirectCountdown={redirectCountdown}
          testId={hasActiveUpsell ? "upsell-crypto-link" : "thank-you-crypto-link"}
        />
      </div>
    );
  }

  return (
    <div className="checkout-success-banner" data-testid="checkout-success-banner">
      <h3>🎉 Pedido Registrado com Sucesso!</h3>
      <p>
        Obrigado, <strong>{customerName}</strong>! Pedido <strong>{createdOrder.order_code}</strong> registrado com sucesso via{' '}
        <strong>{createdOrder.payment_method.toUpperCase()}</strong>.
      </p>
      <div className="checkout-success-details">
        <span>Valor: {formatCurrency(createdOrder.amount_brl, 'BRL')}</span>
        {createdOrder.amount_usd && (
          <span> ({formatCurrency(createdOrder.amount_usd, 'USD')})</span>
        )}
      </div>
      <CheckoutPostPurchaseAction
        createdOrder={createdOrder}
        hasActiveUpsell={hasActiveUpsell}
        postPurchaseTargetUrl={postPurchaseTargetUrl}
        redirectCountdown={redirectCountdown}
        testId={hasActiveUpsell ? "goto-upsell-btn" : "goto-thank-you-btn"}
      />
    </div>
  );
}
