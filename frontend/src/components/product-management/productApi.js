/**
 * Camada de API para gerenciamento de Produtos e Regras de Split.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchProductsApi() {
  const res = await fetch('/api/v1/products', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar lista de produtos.');
  }
  return res.json();
}

export async function createProductApi(payload) {
  const res = await fetch('/api/v1/products', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao cadastrar produto.');
  }
  return res.json();
}

export async function updateProductApi(id, payload) {
  const res = await fetch(`/api/v1/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar produto.');
  }
  return res.json();
}

export async function deleteProductApi(id) {
  const res = await fetch(`/api/v1/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir produto.');
  }
  return res.json();
}

export async function updateProductSplitRulesApi(id, rules) {
  const res = await fetch(`/api/v1/products/${id}/split-rules`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ rules }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar regras de split.');
  }
  return res.json();
}

export async function fetchSplitRecipientsApi() {
  const res = await fetch('/api/v1/split-recipients', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar recebedores de split.');
  }
  return res.json();
}

export async function fetchProductOffersApi(productId) {
  const res = await fetch(`/api/v1/products/${productId}/offers`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar ofertas do produto.');
  }
  return res.json();
}

export async function createProductOfferApi(productId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/offers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao criar oferta.');
  }
  return res.json();
}

export async function updateProductOfferApi(productId, offerId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/offers/${offerId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar oferta.');
  }
  return res.json();
}

export async function deleteProductOfferApi(productId, offerId) {
  const res = await fetch(`/api/v1/products/${productId}/offers/${offerId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir oferta.');
  }
  return res.json();
}

export async function fetchProductWebhooksApi(productId) {
  const res = await fetch(`/api/v1/products/${productId}/webhooks`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar webhooks do produto.');
  }
  return res.json();
}

export async function createProductWebhookApi(productId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/webhooks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao cadastrar webhook.');
  }
  return res.json();
}

export async function updateProductWebhookApi(productId, webhookId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/webhooks/${webhookId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar webhook.');
  }
  return res.json();
}

export async function deleteProductWebhookApi(productId, webhookId) {
  const res = await fetch(`/api/v1/products/${productId}/webhooks/${webhookId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir webhook.');
  }
  return res.json();
}

export async function testProductWebhookApi(productId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/webhooks/test-dispatch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao disparar webhook de teste.');
  }
  return res.json();
}

export async function fetchWebhookDispatchLogsApi(productId) {
  const res = await fetch(`/api/v1/products/${productId}/webhooks/logs`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar histórico de disparos.');
  }
  return res.json();
}

export async function retryWebhookDispatchApi(productId, logId) {
  const res = await fetch(`/api/v1/products/${productId}/webhooks/logs/${logId}/retry`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao reenviar webhook.');
  }
  return res.json();
}

// ==============================================================================
// Pixel do Produto API
// ==============================================================================

export async function fetchProductPixelConfigApi(productId) {
  const res = await fetch(`/api/v1/products/${productId}/pixel`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar configurações de pixel.');
  }
  return res.json();
}

export async function updateProductPixelConfigApi(productId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/pixel`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao salvar configurações de pixel.');
  }
  return res.json();
}

// ==============================================================================
// Order Bumps API
// ==============================================================================

export async function fetchProductOrderBumpsApi(productId) {
  const res = await fetch(`/api/v1/products/${productId}/order-bumps`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar order bumps.');
  }
  return res.json();
}

export async function createProductOrderBumpApi(productId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/order-bumps`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao criar order bump.');
  }
  return res.json();
}

export async function updateProductOrderBumpApi(productId, bumpId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/order-bumps/${bumpId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar order bump.');
  }
  return res.json();
}

export async function deleteProductOrderBumpApi(productId, bumpId) {
  const res = await fetch(`/api/v1/products/${productId}/order-bumps/${bumpId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir order bump.');
  }
  return res.json();
}

// ==============================================================================
// UpSell API
// ==============================================================================

export async function fetchProductUpsellsApi(productId) {
  const res = await fetch(`/api/v1/products/${productId}/upsells`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar ofertas de upsell.');
  }
  return res.json();
}

export async function createProductUpsellApi(productId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/upsells`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao cadastrar oferta de upsell.');
  }
  return res.json();
}

export async function updateProductUpsellApi(productId, upsellId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/upsells/${upsellId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar oferta de upsell.');
  }
  return res.json();
}

export async function deleteProductUpsellApi(productId, upsellId) {
  const res = await fetch(`/api/v1/products/${productId}/upsells/${upsellId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao excluir oferta de upsell.');
  }
  return res.json();
}

export async function fetchProductAppearanceApi(productId) {
  const res = await fetch(`/api/v1/products/${productId}/appearance`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar aparência do checkout.');
  }
  return res.json();
}

export async function updateProductAppearanceApi(productId, payload) {
  const res = await fetch(`/api/v1/products/${productId}/appearance`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao salvar aparência do checkout.');
  }
  return res.json();
}



