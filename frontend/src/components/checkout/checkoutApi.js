/**
 * Funções de API pública para a página de checkout
 */

export async function fetchPublicProductApi(slug) {
  const response = await fetch(`/api/v1/products/public/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Produto ou oferta não encontrada.');
  }
  return response.json();
}

export async function processCheckoutApi(payload) {
  const response = await fetch('/api/v1/checkout/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Não foi possível processar a cobrança.');
  }
  return response.json();
}

export async function checkOrderStatusApi(orderId) {
  const response = await fetch(`/api/v1/checkout/orders/${orderId}/status`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erro ao consultar status do pedido.');
  }
  return response.json();
}

export async function simulatePaymentApi(orderId) {
  const response = await fetch(`/api/v1/checkout/orders/${orderId}/simulate-paid`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erro ao simular pagamento.');
  }
  return response.json();
}

export async function confirmWeb3PaymentApi(orderId, txHash, senderAddress = null) {
  const response = await fetch(`/api/v1/checkout/orders/${orderId}/confirm-web3`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_hash: txHash,
      sender_address: senderAddress,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Erro ao confirmar pagamento Web3.');
  }
  return response.json();
}

export async function fetchOrderByCodeApi(orderCode) {
  const response = await fetch(`/api/v1/checkout/orders/by-code/${encodeURIComponent(orderCode)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Pedido não encontrado.');
  }
  return response.json();
}

export async function validateCouponApi(code, slug, bumpIds = []) {
  const response = await fetch('/api/v1/checkout/validate-coupon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      slug,
      bump_ids: bumpIds && bumpIds.length > 0 ? bumpIds : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Não foi possível validar o cupom de desconto.');
  }
  return response.json();
}



