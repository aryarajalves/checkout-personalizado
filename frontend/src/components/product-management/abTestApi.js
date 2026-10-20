/**
 * Camada de API para Gerenciamento e Rastreamento de Testes A/B de Checkout e Ofertas.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchProductABTestApi(productId) {
  const res = await fetch(`/api/v1/ab-tests/product/${productId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao buscar teste A/B do produto.');
  }
  return res.json();
}

export async function createProductABTestApi(productId, payload) {
  const res = await fetch(`/api/v1/ab-tests/product/${productId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao criar teste A/B.');
  }
  return res.json();
}

export async function updateABTestApi(testId, payload) {
  const res = await fetch(`/api/v1/ab-tests/${testId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar teste A/B.');
  }
  return res.json();
}

export async function deleteABTestApi(testId) {
  const res = await fetch(`/api/v1/ab-tests/${testId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir teste A/B.');
  }
  return res.json();
}

export async function trackABTestEventApi(testId, variant, eventType) {
  try {
    const res = await fetch('/api/v1/ab-tests/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_id: testId,
        variant,
        event_type: eventType,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Falha silenciosa para não travar o carregamento da página pública
    return null;
  }
}
