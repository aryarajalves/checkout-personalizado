/**
 * Camada de API para o Sistema de Recuperação de Vendas e Captura de Leads.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchRecoveryStatsApi() {
  const res = await fetch('/api/v1/recovery/stats', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar métricas de recuperação.');
  }
  return res.json();
}

export async function fetchAbandonedCartsApi({ productId, status, search, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (productId) params.append('product_id', productId);
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);
  params.append('limit', limit);
  params.append('offset', offset);

  const res = await fetch(`/api/v1/recovery/abandoned-carts?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar carrinhos abandonados.');
  }
  return res.json();
}

export async function updateAbandonedCartApi(cartId, data) {
  const res = await fetch(`/api/v1/recovery/abandoned-carts/${cartId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar carrinho.');
  }
  return res.json();
}

export async function fetchPendingPixApi({ productId, status = 'pending', search, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (productId) params.append('product_id', productId);
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);
  params.append('limit', limit);
  params.append('offset', offset);

  const res = await fetch(`/api/v1/recovery/pending-pix?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar pedidos Pix pendentes.');
  }
  return res.json();
}

export async function resendAbandonedWebhookApi(cartId) {
  const res = await fetch(`/api/v1/recovery/abandoned-carts/${cartId}/resend-webhook`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao reenviar webhook de abandono.');
  }
  return res.json();
}

export async function captureLeadApi(payload) {
  const res = await fetch('/api/v1/checkout/capture-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao capturar lead.');
  }
  return res.json();
}
