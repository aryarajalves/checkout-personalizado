/**
 * Camada de API para Gestão de Afiliados, Vínculos de Produtos e Extrato de Comissões.
 */

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAffiliateStatsApi() {
  const res = await fetch('/api/v1/affiliates/stats', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao obter métricas de afiliados.');
  }
  return res.json();
}

export async function fetchAffiliatesApi({ isActive = null, search = '' } = {}) {
  const params = new URLSearchParams();
  if (isActive !== null && isActive !== undefined && isActive !== '') {
    params.append('is_active', isActive);
  }
  if (search) {
    params.append('search', search);
  }
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`/api/v1/affiliates${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar lista de afiliados.');
  }
  return res.json();
}

export async function fetchAffiliateByIdApi(affiliateId) {
  const res = await fetch(`/api/v1/affiliates/${affiliateId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Afiliado não encontrado.');
  }
  return res.json();
}

export async function createAffiliateApi(payload) {
  const res = await fetch('/api/v1/affiliates', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao cadastrar parceiro afiliado.');
  }
  return res.json();
}

export async function updateAffiliateApi(affiliateId, payload) {
  const res = await fetch(`/api/v1/affiliates/${affiliateId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao atualizar parceiro afiliado.');
  }
  return res.json();
}

export async function linkProductToAffiliateApi(affiliateId, payload) {
  const res = await fetch(`/api/v1/affiliates/${affiliateId}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao vincular produto ao afiliado.');
  }
  return res.json();
}

export async function removeProductLinkApi(linkId) {
  const res = await fetch(`/api/v1/affiliates/products/${linkId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao desvincular produto.');
  }
  return true;
}

export async function fetchCommissionsHistoryApi({ affiliateId = null, status = 'all', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (affiliateId) params.append('affiliate_id', affiliateId);
  if (status) params.append('status', status);
  params.append('limit', limit);
  params.append('offset', offset);

  const res = await fetch(`/api/v1/affiliates/commissions/history?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar extrato de comissões.');
  }
  return res.json();
}

export async function markCommissionPaidApi(commissionId, notes = '') {
  const res = await fetch(`/api/v1/affiliates/commissions/${commissionId}/mark-paid`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao marcar comissão como paga.');
  }
  return res.json();
}

export async function trackAffiliateClickApi(slug, refCode) {
  const res = await fetch('/api/v1/affiliates/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, ref_code: refCode }),
  });
  if (!res.ok) return { valid: false };
  return res.json();
}

export async function fetchProductsForAffiliatesApi() {
  const res = await fetch('/api/v1/products', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Falha ao carregar lista de produtos.');
  }
  return res.json();
}

