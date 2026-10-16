/**
 * Camada de API para Gestão de Assinaturas, MRR e Faturas Recorrentes.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchSubscriptionStatsApi() {
  const res = await fetch('/api/v1/subscriptions/stats', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao obter métricas de assinaturas.');
  }
  return res.json();
}

export async function fetchSubscriptionsApi({ status = '', search = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  params.append('limit', limit);
  params.append('offset', offset);

  const query = `?${params.toString()}`;
  const res = await fetch(`/api/v1/subscriptions${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar lista de assinaturas.');
  }
  return res.json();
}

export async function fetchSubscriptionByIdApi(subscriptionId) {
  const res = await fetch(`/api/v1/subscriptions/${subscriptionId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Assinatura não encontrada.');
  }
  return res.json();
}

export async function cancelSubscriptionApi(subscriptionId, reason = '') {
  const res = await fetch(`/api/v1/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason: reason || 'Cancelamento solicitado pelo gestor' }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao cancelar assinatura.');
  }
  return res.json();
}

export async function pauseSubscriptionApi(subscriptionId) {
  const res = await fetch(`/api/v1/subscriptions/${subscriptionId}/pause`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao pausar assinatura.');
  }
  return res.json();
}

export async function resumeSubscriptionApi(subscriptionId) {
  const res = await fetch(`/api/v1/subscriptions/${subscriptionId}/resume`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao reativar assinatura.');
  }
  return res.json();
}

export async function fetchInvoicesApi({ status = '', subscriptionId = null, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (subscriptionId) params.append('subscription_id', subscriptionId);
  params.append('limit', limit);
  params.append('offset', offset);

  const query = `?${params.toString()}`;
  const res = await fetch(`/api/v1/subscriptions/invoices/all${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar faturas recorrentes.');
  }
  return res.json();
}
